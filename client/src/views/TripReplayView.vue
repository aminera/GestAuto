<template>
  <div class="flex h-full flex-col">
    <div class="relative min-h-0 flex-1">
      <BaseMap @ready="onReady" />
      <RouterLink to="/trips" class="absolute top-3 left-14 z-[400] flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-sm shadow hover:bg-slate-50">
        <AppIcon name="chevronLeft" :size="16" /> Trajets
      </RouterLink>
    </div>

    <!-- Panneau de lecture -->
    <div v-if="trip" class="border-t border-slate-200 bg-white p-4">
      <div class="mb-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span class="font-semibold">{{ trip.vehicle?.plate }}</span>
        <span>{{ formatDateTime(trip.startAt) }} → {{ formatDateTime(trip.endAt) }}</span>
        <span>{{ formatKm(trip.distanceKm) }}</span>
        <span>{{ formatDuration(trip.durationSec) }}</span>
        <span>V. max {{ formatSpeed(trip.maxSpeed) }}</span>
        <span v-if="trip.driver">{{ driverName(trip.driver) }}</span>
      </div>
      <div class="flex items-center gap-3">
        <AppButton size="sm" :icon="playing ? 'pause' : 'play'" :disabled="!positions.length" @click="toggle" />
        <input v-model.number="index" type="range" min="0" :max="Math.max(0, positions.length - 1)" class="flex-1 accent-brand-600" />
        <select v-model.number="speed" class="rounded border border-slate-300 px-2 py-1 text-sm">
          <option :value="1">×1</option><option :value="4">×4</option><option :value="10">×10</option><option :value="30">×30</option>
        </select>
      </div>
      <p v-if="current" class="mt-2 text-xs text-slate-500 tabular-nums">
        {{ formatDateTime(current.timestamp) }} · {{ formatSpeed(current.speed) }} · point {{ index + 1 }}/{{ positions.length }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import L from 'leaflet';
import { api } from '@/services/api';
import { notifyError } from '@/composables/useToast';
import { formatDateTime, formatKm, formatDuration, formatSpeed, driverName } from '@/utils/format';
import BaseMap from '@/components/map/BaseMap.vue';
import AppButton from '@/components/ui/AppButton.vue';
import AppIcon from '@/components/ui/AppIcon.vue';

const route = useRoute();
const trip = ref(null);
const positions = ref([]);
const index = ref(0);
const playing = ref(false);
const speed = ref(4);
const current = computed(() => positions.value[index.value]);

let map, marker, timer;
const ll = (p) => [p.location.coordinates[1], p.location.coordinates[0]];
// Couleur du segment selon la vitesse
const speedColor = (s) => (s > (trip.value?.vehicle?.speedLimit ?? 120) ? '#dc2626' : s > 60 ? '#f59e0b' : '#16a34a');

async function onReady(m) {
  map = m;
  try {
    const res = await api.get(`/trips/${route.params.id}`);
    trip.value = res.trip;
    positions.value = res.positions;
    if (!res.positions.length) return;
    for (let i = 1; i < res.positions.length; i++) {
      L.polyline([ll(res.positions[i - 1]), ll(res.positions[i])], { color: speedColor(res.positions[i].speed), weight: 4 }).addTo(map);
    }
    L.circleMarker(ll(res.positions[0]), { radius: 7, color: '#16a34a', fillOpacity: 1 }).bindTooltip('Départ').addTo(map);
    L.circleMarker(ll(res.positions.at(-1)), { radius: 7, color: '#dc2626', fillOpacity: 1 }).bindTooltip('Arrivée').addTo(map);
    marker = L.marker(ll(res.positions[0]), {
      icon: L.divIcon({ className: 'vehicle-marker', iconSize: [30, 30], iconAnchor: [15, 15], html: '<div class="pin" style="background:#2563eb"><div class="arrow"></div></div>' }),
    }).addTo(map);
    map.fitBounds(L.latLngBounds(res.positions.map(ll)).pad(0.15));
  } catch (e) {
    notifyError(e);
  }
}

watch(index, (i) => {
  const p = positions.value[i];
  if (!p || !marker) return;
  marker.setLatLng(ll(p));
  const arrow = marker.getElement()?.querySelector('.arrow');
  if (arrow) arrow.style.transform = `rotate(${p.angle ?? 0}deg)`;
});

function toggle() {
  playing.value = !playing.value;
  clearInterval(timer);
  if (!playing.value) return;
  if (index.value >= positions.value.length - 1) index.value = 0;
  timer = setInterval(() => {
    if (index.value >= positions.value.length - 1) { playing.value = false; clearInterval(timer); return; }
    index.value++;
  }, 1000 / speed.value);
}
watch(speed, () => { if (playing.value) { playing.value = false; toggle(); } });
onBeforeUnmount(() => clearInterval(timer));
</script>
