<template>
  <div>
    <CrudPage
      title="Traceurs GPS"
      subtitle="Boîtiers Teltonika FMC920 — l'affectation à un véhicule se fait depuis la fiche véhicule"
      resource="devices"
      :columns="columns"
      :fields="fields"
      :defaults="{ model: 'FMC920', active: true }"
    >
      <template #cell-online="{ row }">
        <AppBadge :tone="row.online ? 'green' : 'slate'" dot>{{ row.online ? 'En ligne' : 'Hors ligne' }}</AppBadge>
      </template>
      <template #cell-lastSeenAt="{ value }">{{ timeAgo(value) }}</template>
      <template #cell-lastIo="{ value }">
        <span class="text-xs text-slate-600">
          {{ value?.externalVoltage != null ? `${value.externalVoltage.toFixed(1)} V` : '—' }} ·
          GSM {{ value?.gsmSignal ?? '—' }}/5
        </span>
      </template>
      <template #row-actions="{ row }">
        <AppButton size="sm" variant="ghost" icon="send" :disabled="!row.online" title="Envoyer une commande" @click="openCommand(row)" />
      </template>
    </CrudPage>

    <AppModal v-model:open="cmdOpen" :title="`Commande GPRS — ${cmdDevice?.imei}`" size="sm">
      <p class="mb-3 text-sm text-slate-600">Commande SMS/GPRS Teltonika envoyée via Codec 12.</p>
      <div class="mb-3 flex flex-wrap gap-1">
        <button v-for="c in presets" :key="c.cmd" class="rounded-full bg-slate-100 px-2.5 py-1 text-xs hover:bg-slate-200" @click="command = c.cmd">{{ c.label }}</button>
      </div>
      <input v-model="command" class="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" placeholder="getinfo" />
      <pre v-if="response" class="mt-3 max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-xs whitespace-pre-wrap text-green-300">{{ response }}</pre>
      <template #footer>
        <AppButton variant="secondary" @click="cmdOpen = false">Fermer</AppButton>
        <AppButton icon="send" :loading="sending" :disabled="!command" @click="send">Envoyer</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '@/services/api';
import { notifyError } from '@/composables/useToast';
import { formatDateTime, timeAgo } from '@/utils/format';
import CrudPage from '@/components/crud/CrudPage.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';
import AppModal from '@/components/ui/AppModal.vue';

const columns = [
  { key: 'imei', label: 'IMEI' },
  { key: 'model', label: 'Modèle', hideOnMobile: true },
  { key: 'vehicle.plate', label: 'Véhicule' },
  { key: 'online', label: 'État' },
  { key: 'lastSeenAt', label: 'Dernière donnée', hideOnMobile: true },
  { key: 'lastIo', label: 'Alim. / GSM', hideOnMobile: true },
  { key: 'simNumber', label: 'N° SIM', hideOnMobile: true },
];

const fields = [
  { name: 'imei', label: 'IMEI', required: true, hint: '15 chiffres, inscrit sur l’étiquette du boîtier' },
  { name: 'model', label: 'Modèle' },
  { name: 'simNumber', label: 'N° de la carte SIM' },
  { name: 'simOperator', label: 'Opérateur' },
  { name: 'firmware', label: 'Firmware' },
  { name: 'active', label: 'Autorisé à se connecter', type: 'checkbox' },
];

const presets = [
  { label: 'Infos', cmd: 'getinfo' },
  { label: 'Statut', cmd: 'getstatus' },
  { label: 'Version', cmd: 'getver' },
  { label: 'Position', cmd: 'getgps' },
  { label: 'Couper DOUT1 (anti-démarrage)', cmd: 'setdigout 1' },
  { label: 'Rétablir DOUT1', cmd: 'setdigout 0' },
  { label: 'Redémarrer', cmd: 'cpureset' },
];

const cmdOpen = ref(false);
const cmdDevice = ref(null);
const command = ref('getinfo');
const response = ref('');
const sending = ref(false);

function openCommand(d) {
  cmdDevice.value = d;
  response.value = '';
  cmdOpen.value = true;
}

async function send() {
  sending.value = true;
  try {
    const r = await api.post(`/devices/${cmdDevice.value._id}/commands`, { command: command.value });
    response.value = `[${formatDateTime(new Date())}] > ${r.command}\n${r.response}\n\n${response.value}`;
  } catch (e) {
    notifyError(e);
  } finally {
    sending.value = false;
  }
}
</script>
