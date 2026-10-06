import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    type: { type: String, enum: ['vidange', 'revision', 'pneus', 'freins', 'distribution', 'batterie', 'carrosserie', 'autre'], required: true },
    description: String,
    status: { type: String, enum: ['planned', 'done', 'cancelled'], default: 'planned' },
    // Échéance par date et/ou par kilométrage
    dueDate: Date,
    dueOdometerKm: Number,
    doneAt: Date,
    odometerAtService: Number,
    cost: Number,
    garage: String,
    notes: String,
    reminded: { type: Boolean, default: false },
  },
  { timestamps: true },
);

maintenanceSchema.index({ vehicle: 1, status: 1, dueDate: 1 });

maintenanceSchema.pre('save', function (next) {
  if (this.isModified('dueDate') || this.isModified('dueOdometerKm')) this.reminded = false;
  if (this.isModified('status') && this.status === 'done' && !this.doneAt) this.doneAt = new Date();
  next();
});

export const Maintenance = mongoose.model('Maintenance', maintenanceSchema);
