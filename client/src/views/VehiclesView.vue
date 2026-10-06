<template>
  <CrudPage
    title="Véhicules"
    subtitle="Parc automobile, affectation des traceurs et des conducteurs"
    resource="vehicles"
    :columns="columns"
    :fields="fields"
    :filters="filters"
    :defaults="{ status: 'active', fuelType: 'diesel', category: 'voiture', speedLimit: 120 }"
    :row-link="(r) => `/vehicles/${r._id}`"
  >
    <template #cell-plate="{ row }">
      <span class="font-semibold">{{ row.plate }}</span>
      <span class="ml-1 text-slate-500">{{ row.brand }} {{ row.model }}</span>
    </template>
    <template #cell-status="{ value }">
      <AppBadge :tone="{ active: 'green', maintenance: 'amber', inactive: 'slate' }[value]">{{ VEHICLE_STATUS[value] }}</AppBadge>
    </template>
    <template #cell-device="{ row }">
      <span v-if="row.device" class="inline-flex items-center gap-1.5">
        <span :class="['h-2 w-2 rounded-full', row.device.online ? 'bg-green-500' : 'bg-slate-300']" />{{ row.device.imei }}
      </span>
      <span v-else class="text-slate-400">—</span>
    </template>
  </CrudPage>
</template>

<script setup>
import CrudPage from '@/components/crud/CrudPage.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import { VEHICLE_STATUS, CATEGORY, options } from '@/utils/labels';
import { formatKm, driverName } from '@/utils/format';

const columns = [
  { key: 'plate', label: 'Véhicule' },
  { key: 'category', label: 'Catégorie', format: (v) => CATEGORY[v], hideOnMobile: true },
  { key: 'status', label: 'Statut' },
  { key: 'driver', label: 'Conducteur', format: (d) => driverName(d), hideOnMobile: true },
  { key: 'device', label: 'Traceur', hideOnMobile: true },
  { key: 'odometerKm', label: 'Kilométrage', format: formatKm, align: 'right' },
];

const fields = [
  { name: 'plate', label: 'Immatriculation', required: true },
  { name: 'status', label: 'Statut', type: 'select', options: options.vehicleStatus, required: true },
  { name: 'brand', label: 'Marque' },
  { name: 'model', label: 'Modèle' },
  { name: 'year', label: 'Année', type: 'number', min: 1950, max: 2100 },
  { name: 'vin', label: 'N° de châssis (VIN)' },
  { name: 'category', label: 'Catégorie', type: 'select', options: options.category, required: true },
  { name: 'fuelType', label: 'Carburant', type: 'select', options: options.fuel, required: true },
  { name: 'speedLimit', label: 'Limite de vitesse (km/h)', type: 'number', min: 10, max: 250, required: true, hint: 'Seuil d’alerte excès de vitesse' },
  { name: 'odometerKm', label: 'Kilométrage', type: 'number', hint: 'Mis à jour automatiquement par le traceur' },
  { name: 'device', label: 'Traceur', type: 'ref', resource: 'devices', optionLabel: (d) => `${d.imei} (${d.model})${d.vehicle ? ` — ${d.vehicle.plate}` : ''}` },
  { name: 'driver', label: 'Conducteur', type: 'ref', resource: 'drivers', optionLabel: driverName },
  { name: 'notes', label: 'Notes', type: 'textarea', full: true },
];

const filters = [
  { name: 'status', label: 'Statut', options: options.vehicleStatus },
  { name: 'category', label: 'Catégorie', options: options.category },
];
</script>
