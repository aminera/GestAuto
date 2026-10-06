import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    imei: { type: String, required: true, unique: true, match: /^\d{15,17}$/ },
    model: { type: String, default: 'FMC920' },
    manufacturer: { type: String, default: 'Teltonika' },
    simNumber: String,
    simOperator: String,
    firmware: String,
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    online: { type: Boolean, default: false },
    lastSeenAt: Date,
    lastIo: { type: mongoose.Schema.Types.Mixed, default: {} }, // derniers I/O lisibles
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Device = mongoose.model('Device', deviceSchema);
