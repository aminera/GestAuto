<template>
  <div>
    <PageHeader title="Historique des trajets" subtitle="Un trajet = période entre la mise du contact et sa coupure" />

    <div class="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
      <select v-model="filters.vehicle" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
        <option value="">Tous les véhicules</option>
        <option v-for="v in fleet.list" :key="v._id" :value="v._id">{{ v.plate }}</option>
      </select>
      <input v-model="filters.from" type="date" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <input v-model="filters.to" type="date" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <div class="flex items-center justify-end gap-4 text-sm text-slate-600">
        <span><strong>{{ rows.length }}</strong> trajets</span>
        <span><strong>{{ formatKm(totals.distanceKm) }}</strong></span>
        <span><strong>{{ formatDuration(totals.durationSec) }}</strong></span>
      </div>
    </div>

    <DataTable :columns="columns" :rows="rows" :loading="loading" clickable empty-text="Aucun trajet sur la période" @row-click="(t) => router.push(`/trips/${t._id}`)">
      <template #cell-status="{ value }">
        <AppBadge :tone="value === 'ongoing' ? 'green' : 'slate'" :dot="value === 'ongoing'">{{ value === 'ongoing' ? 'En cours' : 'Terminé' }}</AppBadge>
      </template>
      <template #cell-maxSpeed="{ row }">
        <span :class="row.overspeedCount && 'font-medium text-red-600'">{{ formatSpeed(row.maxSpeed) }}</span>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/services/api';
import { useFleetStore } from '@/stores/fleet';
import { notifyError } from '@/composables/useToast';
import { formatDateTime, formatKm, formatDuration, formatSpeed, driverName, toInputDate } from '@/utils/format';
import PageHeader from '@/components/ui/PageHeader.vue';
import DataTable from '@/components/ui/DataTable.vue';
import AppBadge from '@/components/ui/AppBadge.vue';

const route = useRoute();
const router = useRouter();
const fleet = useFleetStore();
const rows = ref([]);
const totals = ref({ distanceKm: 0, durationSec: 0 });
const loading = ref(false);
const filters = reactive({
  vehicle: route.query.vehicle ?? '',
  from: toInputDate(Date.now() - 7 * 86400_000),
  to: toInputDate(Date.now()),
});

const columns = [
  { key: 'vehicle.plate', label: 'Véhicule' },
  { key: 'driver', label: 'Conducteur', format: driverName, hideOnMobile: true },
  { key: 'startAt', label: 'Départ', format: formatDateTime },
  { key: 'endAt', label: 'Arrivée', format: formatDateTime, hideOnMobile: true },
  { key: 'distanceKm', label: 'Distance', format: formatKm, align: 'right' },
  { key: 'durationSec', label: 'Durée', format: formatDuration, align: 'right', hideOnMobile: true },
  { key: 'avgSpeed', label: 'V. moy.', format: formatSpeed, align: 'right', hideOnMobile: true },
  { key: 'maxSpeed', label: 'V. max', align: 'right' },
  { key: 'idleSec', label: 'Ralenti', format: formatDuration, align: 'right', hideOnMobile: true },
  { key: 'status', label: 'Statut' },
];

async function load() {
  loading.value = true;
  try {
    const to = new Date(filters.to); to.setHours(23, 59, 59, 999);
    const res = await api.get('/trips', { vehicle: filters.vehicle, from: new Date(filters.from).toISOString(), to: to.toISOString() });
    rows.value = res.items;
    totals.value = res.totals;
  } catch (e) {
    notifyError(e);
  } finally {
    loading.value = false;
  }
}

watch(filters, load);
onMounted(load);
</script>
