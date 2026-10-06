import { Alert } from '../models/index.js';
import { toPoint } from '../models/shared.js';
import { IO } from '../teltonika/ioElements.js';
import { bus } from '../bus.js';

export async function createAlert(payload) {
  const alert = await Alert.create(payload);
  const populated = await alert.populate([{ path: 'vehicle', select: 'plate brand model' }, { path: 'geofence', select: 'name' }]);
  bus.emit('alert', populated.toObject());
  return populated;
}

// Alertes déclenchées par l'"event IO" du boîtier
const EVENT_ALERTS = {
  [IO.CRASH_DETECTION]: { type: 'crash', severity: 'critical', message: 'Choc / accident détecté' },
  [IO.TOWING]: { type: 'towing', severity: 'critical', message: 'Remorquage détecté (contact coupé)' },
  [IO.JAMMING]: { type: 'jamming', severity: 'critical', message: 'Brouillage GSM détecté' },
  [IO.UNPLUG]: { type: 'unplug', severity: 'critical', message: 'Boîtier débranché de l’alimentation' },
  [IO.GREEN_DRIVING_TYPE]: { type: 'harsh_driving', severity: 'warning', message: 'Conduite brusque' },
};
const HARSH = { 1: 'accélération brusque', 2: 'freinage brusque', 3: 'virage brusque' };

/**
 * Analyse un enregistrement AVL et crée les alertes correspondantes.
 * `vehicle` est modifié en mémoire (flag overspeeding) — sauvegardé par l'appelant.
 */
export async function checkRecord({ vehicle, device, record, io }) {
  const location = toPoint(record.gps.latitude, record.gps.longitude);
  const base = { vehicle: vehicle._id, device: device._id, location, occurredAt: record.timestamp };
  const tasks = [];

  // Excès de vitesse avec hystérésis (5 km/h) pour éviter les alertes en rafale
  const speed = record.gps.speed;
  if (!vehicle.overspeeding && speed > vehicle.speedLimit) {
    vehicle.overspeeding = true;
    tasks.push(createAlert({
      ...base, type: 'overspeed', severity: 'warning',
      message: `Excès de vitesse : ${speed} km/h (limite ${vehicle.speedLimit} km/h)`,
      data: { speed, limit: vehicle.speedLimit },
    }));
  } else if (vehicle.overspeeding && speed < vehicle.speedLimit - 5) {
    vehicle.overspeeding = false;
  }

  // Événements matériels (ne déclencher que sur la valeur "active")
  const ev = EVENT_ALERTS[record.eventIoId];
  const raw = record.io[record.eventIoId];
  if (ev && raw) {
    const message = ev.type === 'harsh_driving' ? `Conduite : ${HARSH[raw] ?? 'événement'} (${io.greenDrivingValue ?? '?'})` : ev.message;
    tasks.push(createAlert({ ...base, ...ev, message, data: { ioId: record.eventIoId, value: raw } }));
  }

  return Promise.all(tasks);
}
