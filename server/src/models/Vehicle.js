import mongoose from 'mongoose';
import { pointSchema } from './shared.js';

const vehicleSchema = new mongoose.Schema(
  {
    plate: { type: String, required: true, unique: true, uppercase: true, trim: true },
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    year: Number,
    vin: { type: String, trim: true, uppercase: true },
    fuelType: { type: String, enum: ['diesel', 'essence', 'hybride', 'electrique', 'gpl'], default: 'diesel' },
    category: { type: String, enum: ['voiture', 'utilitaire', 'camion', 'moto', 'engin'], default: 'voiture' },
    color: String,
    status: { type: String, enum: ['active', 'maintenance', 'inactive'], default: 'active' },
    speedLimit: { type: Number, default: 120 }, // km/h — seuil d'alerte excès de vitesse
    odometerKm: { type: Number, default: 0 },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },

    // Dernier état connu (dénormalisé pour un affichage carte instantané)
    lastPosition: {
      location: pointSchema,
      speed: Number,
      angle: Number,
      altitude: Number,
      satellites: Number,
      ignition: Boolean,
      externalVoltage: Number,
      timestamp: Date,
    },
    insideGeofences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Geofence' }],
    overspeeding: { type: Boolean, default: false },
    notes: String,
  },
  { timestamps: true },
);

vehicleSchema.index({ 'lastPosition.location': '2dsphere' });

export const Vehicle = mongoose.model('Vehicle', vehicleSchema);
