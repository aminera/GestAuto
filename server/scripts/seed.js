/**
 * Données de démonstration : admin, véhicules, conducteurs, boîtier, zone, échéances.
 * Usage : npm run seed
 */
import mongoose from 'mongoose';
import { connectDb } from '../src/db.js';
import { User, Vehicle, Driver, Device, Geofence, Maintenance, VehicleDocument } from '../src/models/index.js';

await connectDb();

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!(await User.exists({ email }))) {
  await User.create({ name: 'Administrateur', email, role: 'admin', passwordHash: await User.hashPassword(password) });
  console.log(`✓ Admin créé : ${email} / ${password}`);
}

if (!(await Vehicle.countDocuments())) {
  const device = await Device.create({ imei: '356307042441013', simNumber: '+212600000001' });
  const [d1, d2] = await Driver.create([
    { firstName: 'Youssef', lastName: 'Alaoui', phone: '+212600000010', licenseNumber: 'B-123456', licenseExpiry: new Date(Date.now() + 20 * 86400_000) },
    { firstName: 'Sara', lastName: 'Bennani', phone: '+212600000011', licenseNumber: 'B-654321' },
  ]);
  const [v1, v2] = await Vehicle.create([
    { plate: '12345-A-6', brand: 'Dacia', model: 'Logan', year: 2023, fuelType: 'diesel', speedLimit: 90, device: device._id, driver: d1._id },
    { plate: '67890-B-1', brand: 'Renault', model: 'Kangoo', year: 2022, category: 'utilitaire', speedLimit: 100, driver: d2._id },
  ]);
  device.vehicle = v1._id; await device.save();
  d1.vehicle = v1._id; await d1.save();
  d2.vehicle = v2._id; await d2.save();

  await Geofence.create({
    name: 'Dépôt Casablanca', shape: 'circle', center: { type: 'Point', coordinates: [-7.5898, 33.5731] }, radius: 300, color: '#16a34a',
  });
  await Maintenance.create([
    { vehicle: v1._id, type: 'vidange', dueOdometerKm: 130000, description: 'Vidange + filtres' },
    { vehicle: v2._id, type: 'revision', dueDate: new Date(Date.now() + 10 * 86400_000) },
  ]);
  await VehicleDocument.create([
    { type: 'assurance', vehicle: v1._id, provider: 'Wafa Assurance', reference: 'POL-2026-001', expiryDate: new Date(Date.now() + 25 * 86400_000) },
    { type: 'controle_technique', vehicle: v2._id, expiryDate: new Date(Date.now() + 90 * 86400_000) },
  ]);
  console.log('✓ Données de démonstration créées (boîtier IMEI 356307042441013 → 12345-A-6)');
}

await mongoose.disconnect();
