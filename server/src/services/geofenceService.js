import { Geofence } from '../models/index.js';
import { toPoint } from '../models/shared.js';
import { isInsideGeofence } from '../utils/geo.js';
import { createAlert } from './alertService.js';

let cache = { at: 0, items: [] };
const CACHE_TTL_MS = 60_000;

async function activeGeofences() {
  if (Date.now() - cache.at > CACHE_TTL_MS) {
    cache = { at: Date.now(), items: await Geofence.find({ active: true }).lean() };
  }
  return cache.items;
}

export const invalidateGeofenceCache = () => { cache.at = 0; };

/**
 * Détecte les entrées / sorties de zones. Met à jour vehicle.insideGeofences
 * (sauvegardé par l'appelant) pour que l'état survive à un redémarrage.
 */
export async function checkGeofences({ vehicle, device, record }) {
  const point = { lat: record.gps.latitude, lng: record.gps.longitude };
  const inside = new Set((vehicle.insideGeofences ?? []).map(String));
  const alerts = [];

  for (const gf of await activeGeofences()) {
    if (gf.vehicles?.length && !gf.vehicles.some((v) => String(v) === String(vehicle._id))) continue;
    const id = String(gf._id);
    const isIn = isInsideGeofence(point, gf);
    const wasIn = inside.has(id);
    if (isIn === wasIn) continue;

    isIn ? inside.add(id) : inside.delete(id);
    if ((isIn && gf.alertOnEnter) || (!isIn && gf.alertOnExit)) {
      alerts.push(createAlert({
        type: isIn ? 'geofence_enter' : 'geofence_exit',
        severity: 'info',
        message: `${vehicle.plate} ${isIn ? 'est entré dans' : 'est sorti de'} la zone « ${gf.name} »`,
        vehicle: vehicle._id, device: device._id, geofence: gf._id,
        location: toPoint(point.lat, point.lng), occurredAt: record.timestamp,
      }));
    }
  }

  vehicle.insideGeofences = [...inside];
  return Promise.all(alerts);
}
