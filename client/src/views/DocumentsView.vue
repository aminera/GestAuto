<template>
  <CrudPage
    title="Documents"
    subtitle="Assurances, cartes grises, contrôles techniques, permis — rappel avant expiration"
    resource="documents"
    :columns="columns"
    :fields="fields"
    :filters="filters"
    :defaults="{ type: 'assurance' }"
  >
    <template #cell-owner="{ row }">{{ row.vehicle?.plate ?? driverName(row.driver) }}</template>
    <template #cell-expiryDate="{ value }">
      <AppBadge v-if="value" :tone="expiryTone(value)">{{ formatDate(value) }}</AppBadge>
      <span v-else>—</span>
    </template>
  </CrudPage>
</template>

<script setup>
import CrudPage from '@/components/crud/CrudPage.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import { DOCUMENT_TYPE, options } from '@/utils/labels';
import { formatDate, formatMoney, driverName } from '@/utils/format';

function expiryTone(d) {
  const days = (new Date(d) - Date.now()) / 86400_000;
  return days < 0 ? 'red' : days < 30 ? 'amber' : 'green';
}

const columns = [
  { key: 'type', label: 'Type', format: (v) => DOCUMENT_TYPE[v] },
  { key: 'owner', label: 'Véhicule / conducteur' },
  { key: 'reference', label: 'Référence', hideOnMobile: true },
  { key: 'provider', label: 'Organisme', hideOnMobile: true },
  { key: 'expiryDate', label: 'Expiration' },
  { key: 'cost', label: 'Coût', format: formatMoney, align: 'right', hideOnMobile: true },
];

const fields = [
  { name: 'type', label: 'Type', type: 'select', options: options.documentType, required: true },
  { name: 'reference', label: 'Référence / n° de police' },
  { name: 'vehicle', label: 'Véhicule', type: 'ref', resource: 'vehicles', optionLabel: (v) => v.plate },
  { name: 'driver', label: 'Conducteur', type: 'ref', resource: 'drivers', optionLabel: driverName },
  { name: 'provider', label: 'Organisme (assureur, centre…)' },
  { name: 'cost', label: 'Coût (MAD)', type: 'number', step: '0.01' },
  { name: 'issueDate', label: 'Date d’émission', type: 'date' },
  { name: 'expiryDate', label: 'Date d’expiration', type: 'date' },
  { name: 'fileUrl', label: 'Lien vers le fichier', type: 'url', full: true },
  { name: 'notes', label: 'Notes', type: 'textarea', full: true },
];

const filters = [{ name: 'type', label: 'Type', options: options.documentType }];
</script>
