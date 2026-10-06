import mongoose from 'mongoose';
import { pointSchema } from './shared.js';
import { config } from '../config.js';

/**
 * Positions brutes — collection "time series" MongoDB (>= 6.0) :
 * stockage compressé et requêtes par plage de temps très efficaces.
 */
const positionSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true },
    meta: {
      device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
      vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    },
    location: { type: pointSchema, required: true },
    speed: Number,
    angle: Number,
    altitude: Number,
    satellites: Number,
    priority: Number,
    ignition: Boolean,
    eventIoId: Number,
    io: mongoose.Schema.Types.Mixed,
  },
  {
    versionKey: false,
    timeseries: { timeField: 'timestamp', metaField: 'meta', granularity: 'seconds' },
    ...(config.positionsRetentionDays > 0 && { expireAfterSeconds: config.positionsRetentionDays * 86400 }),
  },
);

positionSchema.index({ 'meta.vehicle': 1, timestamp: -1 });

export const Position = mongoose.model('Position', positionSchema);
