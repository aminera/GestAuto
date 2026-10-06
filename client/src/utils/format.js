const dtf = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
const df = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

export const formatDateTime = (d) => (d ? dtf.format(new Date(d)) : '—');
export const formatDate = (d) => (d ? df.format(new Date(d)) : '—');
export const formatKm = (km) => (km == null ? '—' : `${Number(km).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`);
export const formatSpeed = (s) => (s == null ? '—' : `${s} km/h`);
export const formatMoney = (v) => (v == null ? '—' : Number(v).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' }));

export function formatDuration(sec) {
  if (!sec) return '0 min';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

export function timeAgo(d) {
  if (!d) return 'jamais';
  const s = Math.round((Date.now() - new Date(d)) / 1000);
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return `il y a ${Math.round(s / 86400)} j`;
}

export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const toInputDateTime = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export const driverName = (d) => (d ? `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() : '—');

/** État d'un véhicule pour l'affichage (carte, listes, badges). */
export const VEHICLE_STATES = {
  moving: { label: 'En mouvement', color: '#16a34a', tone: 'green' },
  idle: { label: 'Moteur au ralenti', color: '#f59e0b', tone: 'amber' },
  stopped: { label: 'À l’arrêt', color: '#2563eb', tone: 'blue' },
  offline: { label: 'Hors ligne', color: '#94a3b8', tone: 'slate' },
  nodevice: { label: 'Sans traceur', color: '#cbd5e1', tone: 'slate' },
};

export function vehicleState(v) {
  if (!v.device) return 'nodevice';
  if (!v.device.online) return 'offline';
  if (v.lastPosition?.speed > 0) return 'moving';
  if (v.lastPosition?.ignition) return 'idle';
  return 'stopped';
}
