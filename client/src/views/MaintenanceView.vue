<template>
  <CrudPage
    title="Maintenance"
    subtitle="Entretiens planifiés et réalisés — rappels automatiques par date ou kilométrage"
    resource="maintenance"
    :columns="columns"
    :fields="fields"
    :filters="filters"
    :defaults="{ status: 'planned', type: 'vidange' }"
    :searchable="false"
  >
    <template #cell-status="{ value }">
      <AppBadge :tone="{ planned: 'blue', done: 'green', cancelled: 'slate' }[value]">{{ MAINTENANCE_STATUS[value] }}</AppBadge>
    </template>
    <template #cell-due="{ row }">
      <span :class="isLate(row) && 'font-medium text-red-600'">
        {{ row.dueDate ? formatDate(row.dueDate) : '' }}{{ row.dueDate && row.dueOdometerKm ? ' · ' : '' }}{{ row.dueOdometerKm ? formatKm(row.dueOdometerKm) : '' }}
        <template v-if="!row.dueDate && !row.dueOdometerKm">—</template>
      </span>
    </template>
  </CrudPage>
</template>

<script setup>
import CrudPage from '@/components/crud/CrudPage.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import { MAINTENANCE_TYPE, MAINTENANCE_STATUS, options } from '@/utils/labels';
import { formatDate, formatKm, formatMoney } from '@/utils/format';

const isLate = (m) => m.status === 'planned'
  && ((m.dueDate && new Date(m.dueDate) < new Date()) || (m.dueOdometerKm && m.vehicle?.odometerKm >= m.dueOdometerKm));

const columns = [
  { key: 'vehicle.plate', label: 'Véhicule' },
  { key: 'type', label: 'Type', format: (v) => MAINTENANCE_TYPE[v] },
  { key: 'status', label: 'Statut' },
  { key: 'due', label: 'Échéance' },
  { key: 'doneAt', label: 'Réalisé le', format: formatDate, hideOnMobile: true },
  { key: 'garage', label: 'Garage', hideOnMobile: true },
  { key: 'cost', label: 'Coût', format: formatMoney, align: 'right', hideOnMobile: true },
];

const fields = [
  { name: 'vehicle', label: 'Véhicule', type: 'ref', resource: 'vehicles', optionLabel: (v) => `${v.plate} — ${v.brand ?? ''} ${v.model ?? ''}`, required: true },
  { name: 'type', label: 'Type', type: 'select', options: options.maintenanceType, required: true },
  { name: 'status', label: 'Statut', type: 'select', options: options.maintenanceStatus, required: true },
  { name: 'dueDate', label: 'Échéance (date)', type: 'date' },
  { name: 'dueOdometerKm', label: 'Échéance (km)', type: 'number' },
  { name: 'doneAt', label: 'Date de réalisation', type: 'date' },
  { name: 'odometerAtService', label: 'Km à l’intervention', type: 'number' },
  { name: 'cost', label: 'Coût (MAD)', type: 'number', step: '0.01' },
  { name: 'garage', label: 'Garage / prestataire' },
  { name: 'description', label: 'Description', type: 'textarea', full: true },
];

const filters = [
  { name: 'status', label: 'Statut', options: options.maintenanceStatus },
  { name: 'type', label: 'Type', options: options.maintenanceType },
];
</script>
