import mongoose from 'mongoose';
import { pointSchema } from './shared.js';

/** Trajet = période entre contact ON et contact OFF (IO 239). */
const tripSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    status: { type: String, enum: ['ongoing', 'completed'], default: 'ongoing' },
    startAt: { type: Date, required: true },
    endAt: Date,
    startLocation: pointSchema,
    endLocation: pointSchema,
    startOdometerKm: Number,
    distanceKm: { type: Number, default: 0 },
    maxSpeed: { type: Number, default: 0 },
    avgSpeed: { type: Number, default: 0 },
    durationSec: { type: Number, default: 0 },
    idleSec: { type: Number, default: 0 }, // moteur tournant à l'arrêt
    overspeedCount: { type: Number, default: 0 },
    pointsCount: { type: Number, default: 0 },
    lastPoint: { lat: Number, lng: Number, timestamp: Date, speed: Number },
  },
  { timestamps: true },
);

tripSchema.index({ vehicle: 1, startAt: -1 });

export const Trip = mongoose.model('Trip', tripSchema);
