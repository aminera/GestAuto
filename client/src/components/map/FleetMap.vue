<template>
  <BaseMap @ready="onReady" />
</template>

<script setup>
/**
 * Carte de la flotte : un marqueur par véhicule, mis à jour en temps réel
 * via le store (alimenté par Socket.IO). Option : afficher les géofences.
 */
import { watch, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import BaseMap from './BaseMap.vue';
import { vehicleIcon, vehiclePopup, latLngOf } from './vehicleMarker';
import { geofenceLayer } from './geofenceLayer';

const props = defineProps({
  vehicles: { type: Array, default: () => [] },
  geofences: { type: Array, default: () => [] },
  selectedId: String,
  follow: Boolean, // recentrer sur le véhicule sélectionné à chaque mise à jour
});
const emit = defineEmits(['select']);

let map = null;
const markers = new Map();
let zonesLayer = null;
let fitted = false;

function sync() {
  if (!map) return;
  const seen = new Set();
  for (const v of props.vehicles) {
    const ll = latLngOf(v);
    if (!ll) continue;
    seen.add(v._id);
    let m = markers.get(v._id);
    if (!m) {
      m = L.marker(ll, { icon: vehicleIcon(v) }).addTo(map).bindPopup('');
      m.on('click', () => emit('select', v._id));
      markers.set(v._id, m);
    } else {
      m.setLatLng(ll);
      m.setIcon(vehicleIcon(v));
    }
    m.setPopupContent(vehiclePopup(v));
  }
  for (const [id, m] of markers) if (!seen.has(id)) { m.remove(); markers.delete(id); }

  if (!fitted && markers.size) {
    map.fitBounds(L.latLngBounds([...markers.values()].map((m) => m.getLatLng())).pad(0.2), { maxZoom: 15 });
    fitted = true;
  }
  if (props.follow && props.selectedId) focus(props.selectedId, false);
}

function focus(id, openPopup = true) {
  const m = markers.get(id);
  if (!m) return;
  map.setView(m.getLatLng(), Math.max(map.getZoom(), 15), { animate: true });
  if (openPopup) m.openPopup();
}

function drawZones() {
  zonesLayer?.remove();
  zonesLayer = L.layerGroup(props.geofences.map((g) => geofenceLayer(g))).addTo(map);
}

function onReady(m) {
  map = m;
  sync();
  drawZones();
}

watch(() => props.vehicles, sync, { deep: true });
watch(() => props.geofences, () => map && drawZones());
watch(() => props.selectedId, (id) => id && map && focus(id));
onBeforeUnmount(() => markers.clear());
</script>
