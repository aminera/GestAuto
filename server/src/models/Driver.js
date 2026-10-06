import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: String,
    email: { type: String, lowercase: true, trim: true },
    licenseNumber: String,
    licenseCategories: [String],
    licenseExpiry: Date,
    ibutton: { type: String, trim: true, lowercase: true }, // identification conducteur (IO 78)
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    active: { type: Boolean, default: true },
    notes: String,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

driverSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

export const Driver = mongoose.model('Driver', driverSchema);
