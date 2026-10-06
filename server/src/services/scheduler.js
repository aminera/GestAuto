import cron from 'node-cron';
import { Device, Maintenance, VehicleDocument } from '../models/index.js';
import { config } from '../config.js';
import { bus } from '../bus.js';
import { logger } from '../utils/logger.js';
import { createAlert } from './alertService.js';

const LABELS = { assurance: 'Assurance', carte_grise: 'Carte grise', controle_technique: 'Contrôle technique', vignette: 'Vignette', permis: 'Permis', autorisation: 'Autorisation', autre: 'Document' };

/** Marque hors ligne les boîtiers silencieux depuis trop longtemps. */
export async function checkOfflineDevices() {
  const limit = new Date(Date.now() - config.offlineAfterMinutes * 60_000);
  const stale = await Device.find({ online: true, lastSeenAt: { $lt: limit } });
  for (const d of stale) {
    d.online = false;
    await d.save();
    bus.emit('device:status', { deviceId: d._id, vehicleId: d.vehicle, imei: d.imei, online: false });
  }
}

/** Rappels d'entretien (date ou kilométrage) et d'expiration de documents. */
export async function checkDueDates() {
  const horizon = new Date(Date.now() + config.documentReminderDays * 86400_000);

  const docs = await VehicleDocument.find({ reminded: false, expiryDate: { $lte: horizon } }).populate('vehicle', 'plate').populate('driver', 'firstName lastName');
  for (const doc of docs) {
    const who = doc.vehicle?.plate ?? (doc.driver ? `${doc.driver.firstName} ${doc.driver.lastName}` : '');
    const expired = doc.expiryDate < new Date();
    await createAlert({
      type: 'document_expiry', severity: expired ? 'critical' : 'warning',
      message: `${LABELS[doc.type]} ${who} ${expired ? 'expiré' : 'expire'} le ${doc.expiryDate.toLocaleDateString('fr-FR')}`,
      vehicle: doc.vehicle?._id, driver: doc.driver?._id, data: { documentId: doc._id },
    });
    doc.reminded = true;
    await doc.save();
  }

  const maint = await Maintenance.find({ status: 'planned', reminded: false }).populate('vehicle', 'plate odometerKm');
  for (const m of maint) {
    const byDate = m.dueDate && m.dueDate <= horizon;
    const byKm = m.dueOdometerKm && m.vehicle?.odometerKm >= m.dueOdometerKm - 500;
    if (!byDate && !byKm) continue;
    await createAlert({
      type: 'maintenance_due', severity: 'warning',
      message: `Entretien « ${m.type} » à prévoir pour ${m.vehicle?.plate}${m.dueDate ? ` (échéance ${m.dueDate.toLocaleDateString('fr-FR')})` : ''}${m.dueOdometerKm ? ` (à ${m.dueOdometerKm} km)` : ''}`,
      vehicle: m.vehicle?._id, data: { maintenanceId: m._id },
    });
    m.reminded = true;
    await m.save();
  }
}

export function startScheduler() {
  cron.schedule('*/5 * * * *', () => checkOfflineDevices().catch((err) => logger.error({ err }, 'checkOfflineDevices')));
  cron.schedule('0 7 * * *', () => checkDueDates().catch((err) => logger.error({ err }, 'checkDueDates')));
  // Vérification au démarrage
  checkDueDates().catch((err) => logger.error({ err }, 'checkDueDates'));
  logger.info('Planificateur démarré');
}
