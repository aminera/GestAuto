import mongoose from 'mongoose';

/** Documents administratifs : assurance, carte grise, contrôle technique, permis… */
const documentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['assurance', 'carte_grise', 'controle_technique', 'vignette', 'permis', 'autorisation', 'autre'], required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    reference: String,
    provider: String, // assureur, centre de contrôle…
    issueDate: Date,
    expiryDate: Date,
    cost: Number,
    fileUrl: String,
    notes: String,
    reminded: { type: Boolean, default: false },
  },
  { timestamps: true },
);

documentSchema.index({ expiryDate: 1 });

documentSchema.pre('validate', function (next) {
  if (!this.vehicle && !this.driver) return next(new Error('Rattacher le document à un véhicule ou un conducteur'));
  // Une nouvelle date d'expiration réarme le rappel
  if (this.isModified('expiryDate')) this.reminded = false;
  next();
});

export const VehicleDocument = mongoose.model('Document', documentSchema);
