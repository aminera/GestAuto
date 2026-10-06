import mongoose from 'mongoose';
import { pointSchema } from './shared.js';

export const ALERT_TYPES = [
  'overspeed', 'geofence_enter', 'geofence_exit', 'ignition_on', 'ignition_off',
  'unplug', 'low_voltage', 'crash', 'towing', 'jamming', 'harsh_driving',
  'device_offline', 'maintenance_due', 'document_expiry',
];

const alertSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ALERT_TYPES, required: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
    message: { type: String, required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    geofence: { type: mongoose.Schema.Types.ObjectId, ref: 'Geofence' },
    location: pointSchema,
    data: mongoose.Schema.Types.Mixed,
    occurredAt: { type: Date, default: Date.now },
    acknowledged: { type: Boolean, default: false },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: Date,
  },
  { timestamps: true },
);

alertSchema.index({ acknowledged: 1, occurredAt: -1 });
alertSchema.index({ vehicle: 1, occurredAt: -1 });

export const Alert = mongoose.model('Alert', alertSchema);
