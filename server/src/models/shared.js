import mongoose from 'mongoose';

/** Point GeoJSON : coordinates = [longitude, latitude] */
export const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

export const polygonSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Polygon'], default: 'Polygon' },
    coordinates: { type: [[[Number]]], required: true },
  },
  { _id: false },
);

export const toPoint = (lat, lng) => ({ type: 'Point', coordinates: [lng, lat] });
