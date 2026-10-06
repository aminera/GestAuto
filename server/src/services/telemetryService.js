import { Device, Vehicle, Position } from '../models/index.js';
import { toPoint } from '../models/shared.js';
import { humanizeIo } from '../teltonika/ioElements.js';
import { config } from '../config.js';
import { bus } from '../bus.js';
import { logger } from '../utils/logger.js';
import { processTripRecord } from './tripService.js';
import { checkRecord } from './alertService.js';
import { checkGeofences } from './geofenceService.js';

/** Autorise (ou enregistre) un boîtier à la connexion. */
export async function authorizeDevice(imei) {
  const device = await Device.findOne({ imei });
  if (device) return device.active;
  if (!config.autoRegisterDevices) return false;
  await Device.create({ imei });
  logger.info({ imei }, 'Nouveau boîtier enregistré automatiquement');
  return true;
}

export async function setDeviceStatus(imei, online) {
  const device = await Device.findOneAndUpdate({ imei }, { online, ...(online && { lastSeenAt: new Date() }) }, { new: true });
  if (device) bus.emit('device:status', { deviceId: device._id, vehicleId: device.vehicle, imei, online });
}

/**
 * Pipeline de traitement des enregistrements AVL d'un boîtier.
 * Appelé par le serveur TCP avant l'acquittement : si une erreur survient,
 * le boîtier n'est pas acquitté et renverra les données.
 */
export async function handleRecords(imei, records) {
  if (!records.length) return;
  const device = await Device.findOne({ imei });
  if (!device) return;

  // Les boîtiers peuvent envoyer des données bufferisées : traiter dans l'ordre chronologique
  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
  const enriched = sorted.map((r) => ({ record: r, io: humanizeIo(r.io) }));

  const vehicle = device.vehicle ? await Vehicle.findById(device.vehicle) : null;

  await Position.insertMany(enriched.map(({ record: r, io }) => ({
    timestamp: r.timestamp,
    meta: { device: device._id, vehicle: vehicle?._id },
    location: toPoint(r.gps.latitude, r.gps.longitude),
    speed: r.gps.speed, angle: r.gps.angle, altitude: r.gps.altitude, satellites: r.gps.satellites,
    priority: r.priority, eventIoId: r.eventIoId, ignition: io.ignition, io,
  })));

  const last = enriched.at(-1);
  device.lastSeenAt = new Date();
  device.online = true;
  device.lastIo = { ...device.lastIo, ...last.io };
  device.markModified('lastIo');
  await device.save();

  if (!vehicle) return; // boîtier non affecté : positions stockées, pas de logique métier

  for (const item of enriched) {
    const ctx = { vehicle, device, ...item };
    // Coordonnées 0,0 = pas de fix GPS : on ignore pour trajets et géofences
    const hasFix = item.record.gps.latitude !== 0 || item.record.gps.longitude !== 0;
    try {
      if (hasFix) await processTripRecord(ctx);
      await checkRecord(ctx);
      if (hasFix) await checkGeofences(ctx);
    } catch (err) {
      logger.error({ err, imei }, 'Erreur traitement métier');
    }
  }

  const { record: r, io } = last;
  const isNewer = !vehicle.lastPosition?.timestamp || r.timestamp > vehicle.lastPosition.timestamp;
  if (isNewer && (r.gps.latitude !== 0 || r.gps.longitude !== 0)) {
    vehicle.lastPosition = {
      location: toPoint(r.gps.latitude, r.gps.longitude),
      speed: r.gps.speed, angle: r.gps.angle, altitude: r.gps.altitude, satellites: r.gps.satellites,
      ignition: io.ignition, externalVoltage: io.externalVoltage, timestamp: r.timestamp,
    };
  }
  if (io.totalOdometerKm) vehicle.odometerKm = Math.round(io.totalOdometerKm);
  await vehicle.save();

  if (isNewer) {
    bus.emit('position', {
      vehicleId: vehicle._id, deviceId: device._id, imei, plate: vehicle.plate,
      lastPosition: vehicle.lastPosition, odometerKm: vehicle.odometerKm, io,
    });
  }
}
