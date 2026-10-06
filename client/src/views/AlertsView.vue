<template>
  <div>
    <PageHeader title="Alertes" :subtitle="`${unread} non lue(s)`">
      <AppButton variant="secondary" icon="check" :disabled="!unread" @click="ackAll">Tout marquer comme lu</AppButton>
    </PageHeader>

    <div class="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
      <select v-model="filters.type" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
        <option value="">Tous les types</option>
        <option v-for="o in options.alertType" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <select v-model="filters.severity" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
        <option value="">Toutes gravités</option>
        <option value="info">Info</option><option value="warning">Avertissement</option><option value="critical">Critique</option>
      </select>
      <select v-model="filters.acknowledged" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
        <option value="">Lues et non lues</option><option value="false">Non lues</option><option value="true">Lues</option>
      </select>
      <select v-model="filters.vehicle" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
        <option value="">Tous les véhicules</option>
        <option v-for="v in fleet.list" :key="v._id" :value="v._id">{{ v.plate }}</option>
      </select>
    </div>

    <DataTable v-model:page="page" :columns="columns" :rows="rows" :loading="loading" :total="total" :limit="limit" empty-text="Aucune alerte">
      <template #cell-type="{ row }">
        <AppBadge :tone="SEVERITY_TONE[row.severity]" dot>{{ ALERT_TYPE[row.type] }}</AppBadge>
      </template>
      <template #cell-message="{ row }">
        <span :class="!row.acknowledged && 'font-medium'">{{ row.message }}</span>
      </template>
      <template #actions="{ row }">
        <AppButton v-if="!row.acknowledged" size="sm" variant="ghost" icon="check" @click="ack(row)">Lu</AppButton>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import { api } from '@/services/api';
import { useFleetStore } from '@/stores/fleet';
import { notifyError } from '@/composables/useToast';
import { formatDateTime } from '@/utils/format';
import { ALERT_TYPE, SEVERITY_TONE, options } from '@/utils/labels';
import PageHeader from '@/components/ui/PageHeader.vue';
import DataTable from '@/components/ui/DataTable.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';

const fleet = useFleetStore();
const rows = ref([]);
const total = ref(0);
const unread = ref(0);
const page = ref(1);
const limit = 50;
const loading = ref(false);
const filters = reactive({ type: '', severity: '', acknowledged: '', vehicle: '' });

const columns = [
  { key: 'type', label: 'Type' },
  { key: 'message', label: 'Message' },
  { key: 'vehicle.plate', label: 'Véhicule', hideOnMobile: true },
  { key: 'occurredAt', label: 'Date', format: formatDateTime },
];

async function load() {
  loading.value = true;
  try {
    const res = await api.get('/alerts', { ...filters, page: page.value, limit });
    rows.value = res.items;
    total.value = res.total;
    unread.value = res.unread;
    fleet.unreadAlerts = res.unread;
  } catch (e) {
    notifyError(e);
  } finally {
    loading.value = false;
  }
}

async function ack(row) {
  await api.patch(`/alerts/${row._id}/ack`).catch(notifyError);
  load();
}
async function ackAll() {
  await api.post('/alerts/ack-all').catch(notifyError);
  load();
}

watch(filters, () => { page.value = 1; load(); });
watch(page, load);
// Rafraîchir quand une nouvelle alerte arrive en temps réel
watch(() => fleet.lastAlerts.length, () => page.value === 1 && load());
onMounted(load);
</script>
