import { Router } from 'express';
import { requireAuth, requireRole, canWrite, signToken } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { crudRouter } from '../utils/crudRouter.js';
import { invalidateGeofenceCache } from '../services/geofenceService.js';
import {
  User, Vehicle, Driver, Device, Position, Trip, Geofence, Alert, Maintenance, VehicleDocument,
} from '../models/index.js';
import * as S from '../validation/schemas.js';

/** Plage temporelle depuis la query (?from&to), par défaut les dernières 24 h. */
const timeRange = (q) => ({
  $gte: q.from ? new Date(q.from) : new Date(Date.now() - 86400_000),
  $lte: q.to ? new Date(q.to) : new Date(),
});

/** @param {{ sendCommand: Function, isConnected: Function }} gateway */
export function apiRouter(gateway) {
  const api = Router();

  api.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

  // ---------- Authentification ----------
  api.post('/auth/login', async (req, res) => {
    const { email, password } = S.loginSchema.parse(req.body);
    const user = await User.findOne({ email, active: true }).select('+passwordHash');
    if (!user || !(await user.checkPassword(password))) throw new HttpError(401, 'Identifiants incorrects');
    res.json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  });

  api.use(requireAuth);

  api.get('/auth/me', async (req, res) => res.json(await User.findById(req.user.id)));

  // ---------- Utilisateurs (admin) ----------
  const users = Router();
  users.use(requireRole('admin'));
  users.get('/', async (_req, res) => res.json({ items: await User.find().sort('name') }));
  users.post('/', async (req, res) => {
    const { password, ...data } = S.userSchema.parse(req.body);
    if (!password) throw new HttpError(400, 'Mot de passe requis');
    const user = await User.create({ ...data, passwordHash: await User.hashPassword(password) });
    res.status(201).json(user);
  });
  users.patch('/:id', async (req, res) => {
    const { password, ...data } = S.userSchema.partial().parse(req.body);
    if (password) data.passwordHash = await User.hashPassword(password);
    res.json(await User.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }));
  });
  users.delete('/:id', async (req, res) => {
    if (req.params.id === req.user.id) throw new HttpError(400, 'Impossible de supprimer son propre compte');
    await User.findByIdAndDelete(req.params.id);
    res.status(204).end();
  });
  api.use('/users', users);

  // ---------- Véhicules ----------
  api.use('/vehicles', crudRouter(Vehicle, {
    schema: S.vehicleSchema,
    searchFields: ['plate', 'brand', 'model', 'vin'],
    filterFields: ['status', 'category', 'fuelType'],
    populate: [{ path: 'device', select: 'imei model online lastSeenAt' }, { path: 'driver', select: 'firstName lastName phone' }],
    defaultSort: 'plate',
    // Synchronise les affectations boîtier ↔ véhicule et conducteur ↔ véhicule
    afterSave: async (v, _req, prev) => {
      if (String(prev?.device ?? '') !== String(v.device ?? '')) {
        await Device.updateMany({ vehicle: v._id }, { $unset: { vehicle: 1 } });
        if (v.device) {
          await Vehicle.updateMany({ _id: { $ne: v._id }, device: v.device }, { $unset: { device: 1 } });
          await Device.findByIdAndUpdate(v.device, { vehicle: v._id });
        }
      }
      if (String(prev?.driver ?? '') !== String(v.driver ?? '')) {
        await Driver.updateMany({ vehicle: v._id }, { $unset: { vehicle: 1 } });
        if (v.driver) {
          await Vehicle.updateMany({ _id: { $ne: v._id }, driver: v.driver }, { $unset: { driver: 1 } });
          await Driver.findByIdAndUpdate(v.driver, { vehicle: v._id });
        }
      }
    },
    afterDelete: async (v) => {
      await Device.updateMany({ vehicle: v._id }, { $unset: { vehicle: 1 } });
      await Driver.updateMany({ vehicle: v._id }, { $unset: { vehicle: 1 } });
    },
    extend: (r) => {
      // État temps réel de toute la flotte (chargement initial de la carte)
      r.get('/live', async (_req, res) => {
        const items = await Vehicle.find({ status: { $ne: 'inactive' } })
          .select('plate brand model category status speedLimit odometerKm lastPosition device driver')
          .populate('device', 'imei online lastSeenAt lastIo')
          .populate('driver', 'firstName lastName phone')
          .lean();
        res.json({ items });
      });
      // Historique de positions d'un véhicule
      r.get('/:id/positions', async (req, res) => {
        const items = await Position.find({ 'meta.vehicle': req.params.id, timestamp: timeRange(req.query) })
          .sort('timestamp').limit(Math.min(Number(req.query.limit) || 5000, 20000))
          .select('timestamp location speed angle ignition').lean();
        res.json({ items });
      });
    },
  }));

  // ---------- Conducteurs ----------
  api.use('/drivers', crudRouter(Driver, {
    schema: S.driverSchema,
    searchFields: ['firstName', 'lastName', 'phone', 'licenseNumber'],
    filterFields: ['active'],
    populate: { path: 'vehicle', select: 'plate brand model' },
    defaultSort: 'lastName',
  }));

  // ---------- Boîtiers (traceurs) ----------
  api.use('/devices', crudRouter(Device, {
    schema: S.deviceSchema,
    searchFields: ['imei', 'simNumber'],
    filterFields: ['online', 'model'],
    populate: { path: 'vehicle', select: 'plate' },
    defaultSort: 'imei',
    extend: (r) => {
      // Envoi de commande GPRS Codec 12 (ex : getinfo, getstatus, setdigout 1 pour l'anti-démarrage)
      r.post('/:id/commands', canWrite, async (req, res) => {
        const { command } = S.commandSchema.parse(req.body);
        const device = await Device.findById(req.params.id);
        if (!device) throw new HttpError(404, 'Boîtier introuvable');
        if (!gateway.isConnected(device.imei)) throw new HttpError(409, 'Boîtier non connecté');
        try {
          const response = await gateway.sendCommand(device.imei, command);
          res.json({ command, response });
        } catch (e) {
          throw new HttpError(504, e.message);
        }
      });
    },
  }));

  // ---------- Trajets ----------
  api.get('/trips', async (req, res) => {
    const filter = { startAt: timeRange({ from: req.query.from ?? new Date(Date.now() - 7 * 86400_000), to: req.query.to }) };
    if (req.query.vehicle) filter.vehicle = req.query.vehicle;
    if (req.query.driver) filter.driver = req.query.driver;
    const items = await Trip.find(filter).sort('-startAt').limit(500)
      .populate('vehicle', 'plate brand model').populate('driver', 'firstName lastName').lean();
    const totals = items.reduce((t, x) => ({ distanceKm: t.distanceKm + x.distanceKm, durationSec: t.durationSec + x.durationSec }), { distanceKm: 0, durationSec: 0 });
    res.json({ items, totals });
  });
  api.get('/trips/:id', async (req, res) => {
    const trip = await Trip.findById(req.params.id).populate('vehicle', 'plate brand model speedLimit').populate('driver', 'firstName lastName');
    if (!trip) throw new HttpError(404, 'Trajet introuvable');
    const positions = await Position.find({
      'meta.vehicle': trip.vehicle._id,
      timestamp: { $gte: trip.startAt, $lte: trip.endAt ?? new Date() },
    }).sort('timestamp').select('timestamp location speed angle ignition').lean();
    res.json({ trip, positions });
  });

  // ---------- Géofences ----------
  api.use('/geofences', crudRouter(Geofence, {
    schema: S.geofenceSchema,
    searchFields: ['name'],
    filterFields: ['active', 'shape'],
    defaultSort: 'name',
    afterSave: async () => invalidateGeofenceCache(),
    afterDelete: async (g) => {
      invalidateGeofenceCache();
      await Vehicle.updateMany({}, { $pull: { insideGeofences: g._id } });
    },
  }));

  // ---------- Alertes ----------
  api.get('/alerts', async (req, res) => {
    const filter = {};
    if (req.query.vehicle) filter.vehicle = req.query.vehicle;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.acknowledged !== undefined && req.query.acknowledged !== '') filter.acknowledged = req.query.acknowledged === 'true';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const [items, total, unread] = await Promise.all([
      Alert.find(filter).sort('-occurredAt').skip((page - 1) * limit).limit(limit)
        .populate('vehicle', 'plate').populate('geofence', 'name').lean(),
      Alert.countDocuments(filter),
      Alert.countDocuments({ acknowledged: false }),
    ]);
    res.json({ items, total, unread, page, limit });
  });
  api.patch('/alerts/:id/ack', async (req, res) => {
    res.json(await Alert.findByIdAndUpdate(req.params.id, { acknowledged: true, acknowledgedBy: req.user.id, acknowledgedAt: new Date() }, { new: true }));
  });
  api.post('/alerts/ack-all', async (req, res) => {
    const r = await Alert.updateMany({ acknowledged: false }, { acknowledged: true, acknowledgedBy: req.user.id, acknowledgedAt: new Date() });
    res.json({ updated: r.modifiedCount });
  });

  // ---------- Maintenance & documents ----------
  api.use('/maintenance', crudRouter(Maintenance, {
    schema: S.maintenanceSchema,
    searchFields: ['description', 'garage'],
    filterFields: ['vehicle', 'status', 'type'],
    populate: { path: 'vehicle', select: 'plate odometerKm' },
    defaultSort: 'dueDate',
  }));
  api.use('/documents', crudRouter(VehicleDocument, {
    schema: S.documentSchema,
    searchFields: ['reference', 'provider'],
    filterFields: ['vehicle', 'driver', 'type'],
    populate: [{ path: 'vehicle', select: 'plate' }, { path: 'driver', select: 'firstName lastName' }],
    defaultSort: 'expiryDate',
  }));

  // ---------- Tableau de bord ----------
  api.get('/dashboard', async (_req, res) => {
    const now = new Date();
    const in30d = new Date(Date.now() + 30 * 86400_000);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [vehicles, unreadAlerts, latestAlerts, maintenanceDue, documentsDue, tripsToday] = await Promise.all([
      Vehicle.find({ status: { $ne: 'inactive' } }).select('status lastPosition device').populate('device', 'online').lean(),
      Alert.countDocuments({ acknowledged: false }),
      Alert.find().sort('-occurredAt').limit(8).populate('vehicle', 'plate').lean(),
      Maintenance.countDocuments({ status: 'planned', dueDate: { $lte: in30d } }),
      VehicleDocument.countDocuments({ expiryDate: { $lte: in30d } }),
      Trip.aggregate([{ $match: { startAt: { $gte: startOfDay } } }, { $group: { _id: null, count: { $sum: 1 }, distanceKm: { $sum: '$distanceKm' } } }]),
    ]);
    const fleet = { total: vehicles.length, moving: 0, idle: 0, stopped: 0, offline: 0, maintenance: 0 };
    for (const v of vehicles) {
      if (v.status === 'maintenance') fleet.maintenance++;
      if (!v.device?.online) fleet.offline++;
      else if (v.lastPosition?.speed > 0) fleet.moving++;
      else if (v.lastPosition?.ignition) fleet.idle++;
      else fleet.stopped++;
    }
    res.json({
      fleet, unreadAlerts, latestAlerts, maintenanceDue, documentsDue,
      today: { trips: tripsToday[0]?.count ?? 0, distanceKm: +(tripsToday[0]?.distanceKm ?? 0).toFixed(1) },
    });
  });

  return api;
}
