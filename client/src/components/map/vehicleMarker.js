import L from 'leaflet';
import { VEHICLE_STATES, vehicleState, formatSpeed, timeAgo, driverName } from '@/utils/format';

/** Icône de véhicule : pastille colorée selon l'état + flèche orientée selon le cap GPS. */
export function vehicleIcon(v, { showLabel = true } = {}) {
  const state = VEHICLE_STATES[vehicleState(v)];
  const angle = v.lastPosition?.angle ?? 0;
  return L.divIcon({
    className: 'vehicle-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div class="pin" style="background:${state.color}"><div class="arrow" style="transform:rotate(${angle}deg)"></div></div>${showLabel ? `<div class="label">${v.plate}</div>` : ''}`,
  });
}

export function vehiclePopup(v) {
  const p = v.lastPosition ?? {};
  const state = VEHICLE_STATES[vehicleState(v)];
  return `
    <div style="min-width:180px">
      <strong>${v.plate}</strong> <span style="color:#64748b">${v.brand ?? ''} ${v.model ?? ''}</span><br/>
      <span style="color:${state.color}">● ${state.label}</span><br/>
      Vitesse : ${formatSpeed(p.speed)}<br/>
      Conducteur : ${driverName(v.driver)}<br/>
      Tension : ${p.externalVoltage != null ? `${p.externalVoltage.toFixed(1)} V` : '—'}<br/>
      Dernière position : ${timeAgo(p.timestamp)}<br/>
      <a href="/vehicles/${v._id}">Voir la fiche →</a>
    </div>`;
}

export const latLngOf = (v) => {
  const c = v.lastPosition?.location?.coordinates;
  return c ? [c[1], c[0]] : null;
};
