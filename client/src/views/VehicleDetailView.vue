<template>
  <div v-if="vehicle">
    <PageHeader :title="vehicle.plate" :subtitle="`${vehicle.brand ?? ''} ${vehicle.model ?? ''} ${vehicle.year ?? ''}`">
      <AppBadge :tone="VEHICLE_STATES[state].tone" dot>{{ VEHICLE_STATES[state].label }}</AppBadge>
      <AppButton variant="secondary" icon="route" :to="{ path: '/trips', query: { vehicle: vehicle._id } }">Trajets</AppButton>
      <AppButton variant="secondary" icon="chevronLeft" to="/vehicles">Retour</AppButton>
    </PageHeader>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Carte + trace des dernières 24 h -->
      <section class="h-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2 lg:h-[460px]">
        <BaseMap @ready="onMapReady" />
      </section>

      <!-- Télémétrie -->
      <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 class="mb-3 font-semibold">Télémétrie</h2>
        <dl class="grid grid-cols-2 gap-3 text-sm">
          <div v-for="m in metrics" :key="m.label">
            <dt class="text-xs text-slate-500">{{ m.label }}</dt>
            <dd class="font-medium">{{ m.value }}</dd>
          </div>
        </dl>
        <h2 class="mt-5 mb-2 font-semibold">Affectations</h2>
        <p class="text-sm"><span class="text-slate-500">Conducteur :</span> {{ driverName(vehicle.driver) }} <span v-if="vehicle.driver?.phone" class="text-slate-500">({{ vehicle.driver.phone }})</span></p>
        <p class="text-sm"><span class="text-slate-500">Traceur :</span> {{ vehicle.device ? `${vehicle.device.imei}` : 'aucun' }}</p>
      </section>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <section>
        <h2 class="mb-2 font-semibold">Derniers trajets</h2>
        <DataTable :columns="tripColumns" :rows="trips" clickable empty-text="Aucun trajet sur 7 jours" @row-click="(t) => router.push(`/trips/${t._id}`)" />
      </section>
      <section>
        <h2 class="mb-2 font-semibold">Entretiens & documents</h2>
        <DataTable :columns="dueColumns" :rows="dues" empty-text="Aucune échéance" />
      </section>
    </div>
  </div>
  <p v-else class="text-slate-400">Chargement…</p>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import L from 'leaflet';
import { api } from '@/services/api';
import { getSocket } from '@/services/socket';
import { useFleetStore } from '@/stores/fleet';
import { notifyError } from '@/composables/useToast';
import { VEHICLE_STATES, vehicleState, driverName, formatSpeed, formatKm, formatDateTime, formatDate, formatDuration, timeAgo } from '@/utils/format';
import { MAINTENANCE_TYPE, DOCUMENT_TYPE } from '@/utils/labels';
import { vehicleIcon, latLngOf } from '@/components/map/vehicleMarker';
import PageHeader from '@/components/ui/PageHeader.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';
import DataTable from '@/components/ui/DataTable.vue';
import BaseMap from '@/components/map/BaseMap.vue';

const route = useRoute();
const router = useRouter();
const fleet = useFleetStore();
const id = route.params.id;

const base = ref(null);
const trips = ref([]);
const dues = ref([]);
// Préférer l'état temps réel du store s'il existe
const vehicle = computed(() => (base.value ? { ...base.value, ...(fleet.vehicles[id] ?? {}) } : null));
const state = computed(() => vehicleState(vehicle.value));

const metrics = computed(() => {
  const p = vehicle.value.lastPosition ?? {};
  const io = vehicle.value.device?.lastIo ?? {};
  return [
    { label: 'Vitesse', value: formatSpeed(p.speed) },
    { label: 'Contact', value: p.ignition ? 'ON' : 'OFF' },
    { label: 'Odomètre', value: formatKm(vehicle.value.odometerKm) },
    { label: 'Limite', value: formatSpeed(vehicle.value.speedLimit) },
    { label: 'Tension véhicule', value: io.externalVoltage != null ? `${io.externalVoltage.toFixed(2)} V` : '—' },
    { label: 'Batterie interne', value: io.batteryVoltage != null ? `${io.batteryVoltage.toFixed(2)} V` : '—' },
    { label: 'Signal GSM', value: io.gsmSignal != null ? `${io.gsmSignal}/5` : '—' },
    { label: 'Satellites', value: p.satellites ?? '—' },
    { label: 'Altitude', value: p.altitude != null ? `${p.altitude} m` : '—' },
    { label: 'Dernière donnée', value: timeAgo(p.timestamp) },
  ];
});

const tripColumns = [
  { key: 'startAt', label: 'Départ', format: formatDateTime },
  { key: 'distanceKm', label: 'Distance', format: formatKm, align: 'right' },
  { key: 'durationSec', label: 'Durée', format: formatDuration, align: 'right' },
  { key: 'maxSpeed', label: 'V. max', format: formatSpeed, align: 'right', hideOnMobile: true },
];
const dueColumns = [
  { key: 'label', label: 'Élément' },
  { key: 'due', label: 'Échéance' },
];

// --- Carte : marqueur + trace 24 h, mise à jour en direct
let map, marker, trail;
function onMapReady(m) {
  map = m;
  trail = L.polyline([], { color: '#2563eb', weight: 3, opacity: 0.7 }).addTo(map);
  loadTrail();
}
async function loadTrail() {
  const { items } = await api.get(`/vehicles/${id}/positions`, { limit: 3000 });
  trail.setLatLngs(items.map((p) => [p.location.coordinates[1], p.location.coordinates[0]]));
  updateMarker(true);
}
function updateMarker(fit = false) {
  if (!map || !vehicle.value) return;
  const ll = latLngOf(vehicle.value);
  if (!ll) return;
  if (!marker) marker = L.marker(ll, { icon: vehicleIcon(vehicle.value, { showLabel: false }) }).addTo(map);
  else { marker.setLatLng(ll); marker.setIcon(vehicleIcon(vehicle.value, { showLabel: false })); }
  if (fit) map.setView(ll, 14);
}
watch(() => vehicle.value?.lastPosition?.timestamp, (ts, old) => {
  if (!ts || ts === old) return;
  updateMarker();
  const ll = latLngOf(vehicle.value);
  if (ll && trail) trail.addLatLng(ll);
});

onMounted(async () => {
  try {
    const [v, t, m, d] = await Promise.all([
      api.get(`/vehicles/${id}`),
      api.get('/trips', { vehicle: id }),
      api.get('/maintenance', { vehicle: id, status: 'planned', limit: 20 }),
      api.get('/documents', { vehicle: id, limit: 20 }),
    ]);
    base.value = v;
    trips.value = t.items.slice(0, 8);
    dues.value = [
      ...m.items.map((x) => ({ _id: x._id, label: MAINTENANCE_TYPE[x.type], due: [x.dueDate && formatDate(x.dueDate), x.dueOdometerKm && formatKm(x.dueOdometerKm)].filter(Boolean).join(' · ') || '—' })),
      ...d.items.map((x) => ({ _id: x._id, label: DOCUMENT_TYPE[x.type], due: formatDate(x.expiryDate) })),
    ];
    getSocket().emit('subscribe', id);
    updateMarker(true);
  } catch (e) {
    notifyError(e);
  }
});
onBeforeUnmount(() => getSocket().emit('unsubscribe', id));
</script>
