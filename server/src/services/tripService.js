import { Trip, Driver } from '../models/index.js';
import { toPoint } from '../models/shared.js';
import { haversineKm } from '../utils/geo.js';

/**
 * Détection des trajets à partir du contact (IO 239 Ignition) :
 *  - contact ON sans trajet en cours → ouverture
 *  - contact ON avec trajet en cours → mise à jour (distance, vitesses, ralenti)
 *  - contact OFF avec trajet en cours → clôture
 */
export async function processTripRecord({ vehicle, device, record, io }) {
  const ignition = io.ignition ?? record.gps.speed > 0;
  const point = { lat: record.gps.latitude, lng: record.gps.longitude, timestamp: record.timestamp, speed: record.gps.speed };
  let trip = await Trip.findOne({ vehicle: vehicle._id, status: 'ongoing' });

  if (!trip && !ignition) return null;

  if (!trip) {
    // Conducteur identifié par iButton, sinon conducteur affecté au véhicule
    let driver = vehicle.driver;
    if (io.ibutton) driver = (await Driver.findOne({ ibutton: io.ibutton }).select('_id'))?._id ?? driver;
    return Trip.create({
      vehicle: vehicle._id, device: device._id, driver,
      startAt: record.timestamp,
      startLocation: toPoint(point.lat, point.lng),
      startOdometerKm: io.totalOdometerKm ?? vehicle.odometerKm,
      lastPoint: point, pointsCount: 1,
    });
  }

  // Ignorer les enregistrements plus anciens que le dernier point (données bufferisées)
  if (trip.lastPoint?.timestamp && record.timestamp <= trip.lastPoint.timestamp) return trip;

  const dtSec = (record.timestamp - trip.lastPoint.timestamp) / 1000;
  // Distance : odomètre du boîtier si disponible (plus fiable), sinon haversine
  if (io.totalOdometerKm != null && trip.startOdometerKm != null) {
    trip.distanceKm = Math.max(0, io.totalOdometerKm - trip.startOdometerKm);
  } else {
    trip.distanceKm += haversineKm(trip.lastPoint, point);
  }
  if (ignition && record.gps.speed === 0 && trip.lastPoint.speed === 0) trip.idleSec += dtSec;
  if (record.gps.speed > vehicle.speedLimit) trip.overspeedCount += vehicle.overspeeding ? 0 : 1;

  trip.maxSpeed = Math.max(trip.maxSpeed, record.gps.speed);
  trip.durationSec = (record.timestamp - trip.startAt) / 1000;
  trip.avgSpeed = trip.durationSec > 0 ? +(trip.distanceKm / (trip.durationSec / 3600)).toFixed(1) : 0;
  trip.distanceKm = +trip.distanceKm.toFixed(3);
  trip.lastPoint = point;
  trip.pointsCount += 1;

  if (!ignition) {
    trip.status = 'completed';
    trip.endAt = record.timestamp;
    trip.endLocation = toPoint(point.lat, point.lng);
  }
  return trip.save();
}
