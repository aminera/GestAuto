<template>
  <CrudPage
    title="Utilisateurs"
    subtitle="Comptes d'accès à la plateforme et rôles"
    resource="users"
    :columns="columns"
    :fields="fields"
    :defaults="{ role: 'viewer', active: true }"
    :searchable="false"
    :before-save="beforeSave"
  >
    <template #cell-role="{ value }"><AppBadge :tone="value === 'admin' ? 'red' : value === 'manager' ? 'blue' : 'slate'">{{ ROLES[value] }}</AppBadge></template>
    <template #cell-active="{ value }"><AppBadge :tone="value ? 'green' : 'slate'">{{ value ? 'Actif' : 'Désactivé' }}</AppBadge></template>
  </CrudPage>
</template>

<script setup>
import CrudPage from '@/components/crud/CrudPage.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import { ROLES, options } from '@/utils/labels';
import { formatDate } from '@/utils/format';

const columns = [
  { key: 'name', label: 'Nom' },
  { key: 'email', label: 'E-mail' },
  { key: 'role', label: 'Rôle' },
  { key: 'active', label: 'Statut' },
  { key: 'createdAt', label: 'Créé le', format: formatDate, hideOnMobile: true },
];

const fields = [
  { name: 'name', label: 'Nom', required: true },
  { name: 'email', label: 'E-mail', type: 'email', required: true },
  { name: 'role', label: 'Rôle', type: 'select', options: options.roles, required: true },
  { name: 'password', label: 'Mot de passe', type: 'password', hint: '8 caractères minimum — laisser vide pour ne pas modifier' },
  { name: 'active', label: 'Compte actif', type: 'checkbox' },
];

// Ne pas envoyer un mot de passe vide lors d'une modification
const beforeSave = ({ password, ...rest }) => (password ? { ...rest, password } : rest);
</script>
