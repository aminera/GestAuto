<template>
  <CrudPage
    title="Conducteurs"
    subtitle="Conducteurs, permis et identification iButton"
    resource="drivers"
    :columns="columns"
    :fields="fields"
    :defaults="{ active: true }"
    :before-save="(d) => ({ ...d, email: d.email || null })"
  >
    <template #cell-lastName="{ row }">
      <span class="font-medium">{{ row.firstName }} {{ row.lastName }}</span>
    </template>
    <template #cell-licenseExpiry="{ value }">
      <span :class="isSoon(value) && 'font-medium text-red-600'">{{ formatDate(value) }}</span>
    </template>
    <template #cell-active="{ value }">
      <AppBadge :tone="value ? 'green' : 'slate'">{{ value ? 'Actif' : 'Inactif' }}</AppBadge>
    </template>
  </CrudPage>
</template>

<script setup>
import CrudPage from '@/components/crud/CrudPage.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import { formatDate } from '@/utils/format';

const isSoon = (d) => d && new Date(d) < new Date(Date.now() + 30 * 86400_000);

const columns = [
  { key: 'lastName', label: 'Nom' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'vehicle.plate', label: 'Véhicule', hideOnMobile: true },
  { key: 'licenseNumber', label: 'Permis', hideOnMobile: true },
  { key: 'licenseExpiry', label: 'Expiration permis', hideOnMobile: true },
  { key: 'active', label: 'Statut' },
];

const fields = [
  { name: 'firstName', label: 'Prénom', required: true },
  { name: 'lastName', label: 'Nom', required: true },
  { name: 'phone', label: 'Téléphone', type: 'tel' },
  { name: 'email', label: 'E-mail', type: 'email' },
  { name: 'licenseNumber', label: 'N° de permis' },
  { name: 'licenseExpiry', label: 'Expiration du permis', type: 'date' },
  { name: 'ibutton', label: 'Identifiant iButton', hint: 'Clé Dallas lue par le FMC920 (IO 78), en hexadécimal' },
  { name: 'active', label: 'Actif', type: 'checkbox' },
  { name: 'notes', label: 'Notes', type: 'textarea', full: true },
];
</script>
