import mongoose from 'mongoose';
import { pointSchema, polygonSchema } from './shared.js';

const geofenceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    shape: { type: String, enum: ['circle', 'polygon'], required: true },
    center: pointSchema, // si cercle
    radius: Number, // mètres, si cercle
    area: polygonSchema, // si polygone
    color: { type: String, default: '#2563eb' },
    vehicles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }], // vide = tous les véhicules
    alertOnEnter: { type: Boolean, default: true },
    alertOnExit: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

geofenceSchema.pre('validate', function (next) {
  if (this.shape === 'circle' && (!this.center || !this.radius)) return next(new Error('Un cercle nécessite center et radius'));
  if (this.shape === 'polygon' && !this.area) return next(new Error('Un polygone nécessite area'));
  next();
});

export const Geofence = mongoose.model('Geofence', geofenceSchema);
