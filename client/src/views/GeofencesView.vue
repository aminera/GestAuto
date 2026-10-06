<template>
  <div class="flex h-full flex-col md:flex-row">
    <!-- Liste / éditeur -->
    <aside class="flex max-h-[50%] flex-col border-b border-slate-200 bg-white md:max-h-none md:w-80 md:border-r md:border-b-0">
      <template v-if="!draft">
        <div class="flex items-center justify-between border-b border-slate-200 p-3">
          <h2 class="font-semibold">Zones ({{ zones.length }})</h2>
          <AppButton v-if="auth.canWrite" size="sm" icon="plus" @click="startDraft">Nouvelle</AppButton>
        </div>
        <ul class="flex-1 divide-y divide-slate-100 overflow-y-auto">
          <li v-for="z in zones" :key="z._id" class="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50">
            <span class="h-3 w-3 shrink-0 rounded" :style="{ background: z.color }" />
            <button class="min-w-0 flex-1 text-left" @click="focusZone(z)">
              <p class="truncate text-sm font-medium">{{ z.name }}</p>
              <p class="text-xs text-slate-500">{{ z.shape === 'circle' ? `Cercle · ${z.radius} m` : `Polygone · ${z.area.coordinates[0].length - 1} points` }}{{ z.active ? '' : ' · inactive' }}</p>
            </button>
            <template v-if="auth.canWrite">
              <AppButton size="sm" variant="ghost" icon="edit" @click="editZone(z)" />
              <AppButton size="sm" variant="ghost" icon="trash" class="text-red-600" @click="removeZone(z)" />
            </template>
          </li>
          <li v-if="!zones.length" class="p-6 text-center text-sm text-slate-400">Aucune zone. Créez votre premier dépôt, site client…</li>
        </ul>
      </template>

      <form v-else class="flex-1 space-y-3 overflow-y-auto p-4" @submit.prevent="saveDraft">
        <h2 class="font-semibold">{{ draft._id ? 'Modifier la zone' : 'Nouvelle zone' }}</h2>
        <FormField v-model="draft.name" :field="{ name: 'name', label: 'Nom', required: true }" />
        <div class="flex gap-2">
          <button v-for="s in ['circle', 'polygon']" :key="s" type="button"
            :class="['flex-1 rounded-lg border px-3 py-1.5 text-sm', draft.shape === s ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300']"
            @click="setShape(s)">{{ s === 'circle' ? 'Cercle' : 'Polygone' }}</button>
        </div>
        <p class="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
          {{ draft.shape === 'circle' ? 'Cliquez sur la carte pour placer le centre.' : 'Cliquez sur la carte pour ajouter les sommets (3 minimum).' }}
        </p>
        <FormField v-if="draft.shape === 'circle'" v-model.number="draft.radius" :field="{ name: 'radius', label: 'Rayon (m)', type: 'number', min: 10, required: true }" />
        <AppButton v-else size="sm" variant="secondary" :disabled="!draft.points.length" @click="draft.points.pop(); drawDraft()">Annuler le dernier point</AppButton>
        <FormField v-model="draft.color" :field="{ name: 'color', label: 'Couleur', type: 'color' }" />
        <FormField v-model="draft.alertOnEnter" :field="{ name: 'alertOnEnter', label: 'Alerte à l’entrée', type: 'checkbox' }" />
        <FormField v-model="draft.alertOnExit" :field="{ name: 'alertOnExit', label: 'Alerte à la sortie', type: 'checkbox' }" />
        <FormField v-model="draft.active" :field="{ name: 'active', label: 'Zone active', type: 'checkbox' }" />
        <div class="flex gap-2 pt-2">
          <AppButton variant="secondary" class="flex-1" @click="cancelDraft">Annuler</AppButton>
          <AppButton type="submit" class="flex-1" :loading="saving" :disabled="!isDraftValid">Enregistrer</AppButton>
        </div>
      </form>
    </aside>

    <div class="min-h-0 flex-1"><BaseMap @ready="onReady" @click="onMapClick" /></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import L from 'leaflet';
import { resource } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { notify, notifyError } from '@/composables/useToast';
import { geofenceLayer } from '@/components/map/geofenceLayer';
import BaseMap from '@/components/map/BaseMap.vue';
import AppButton from '@/components/ui/AppButton.vue';
import FormField from '@/components/ui/FormField.vue';

const api = resource('geofences');
const auth = useAuthStore();
const zones = ref([]);
const draft = ref(null);
const saving = ref(false);

let map, zonesLayer, draftLayer;

async function load() {
  zones.value = (await api.list({ limit: 500 })).items;
  drawZones();
}
function drawZones() {
  if (!map) return;
  zonesLayer?.remove();
  zonesLayer = L.featureGroup(zones.value.filter((z) => z._id !== draft.value?._id).map((z) => geofenceLayer(z, z.active ? {} : { dashArray: '4 4' }))).addTo(map);
}
function onReady(m) { map = m; drawZones(); }

function focusZone(z) {
  const layer = geofenceLayer(z);
  layer.addTo(map); // nécessaire pour calculer les bornes d'un cercle
  map.fitBounds(layer.getBounds().pad(0.3));
  layer.remove();
}

// --- Édition
const emptyDraft = () => ({ name: '', shape: 'circle', center: null, radius: 300, points: [], color: '#2563eb', alertOnEnter: true, alertOnExit: true, active: true });
function startDraft() { draft.value = emptyDraft(); drawZones(); drawDraft(); }
function editZone(z) {
  draft.value = {
    ...emptyDraft(), ...z,
    center: z.center ? [z.center.coordinates[1], z.center.coordinates[0]] : null,
    points: z.area ? z.area.coordinates[0].slice(0, -1).map(([lng, lat]) => [lat, lng]) : [],
  };
  drawZones();
  drawDraft();
  focusZone(z);
}
function cancelDraft() { draft.value = null; draftLayer?.remove(); drawZones(); }
function setShape(s) { draft.value.shape = s; drawDraft(); }

function onMapClick(e) {
  if (!draft.value) return;
  const p = [e.latlng.lat, e.latlng.lng];
  if (draft.value.shape === 'circle') draft.value.center = p;
  else draft.value.points.push(p);
  drawDraft();
}

function drawDraft() {
  draftLayer?.remove();
  const d = draft.value;
  if (!d || !map) return;
  const style = { color: d.color, weight: 2, dashArray: '6 4', fillOpacity: 0.15 };
  draftLayer = L.layerGroup().addTo(map);
  if (d.shape === 'circle' && d.center) L.circle(d.center, { radius: d.radius || 0, ...style }).addTo(draftLayer);
  if (d.shape === 'polygon') {
    if (d.points.length >= 2) L.polygon(d.points, style).addTo(draftLayer);
    d.points.forEach((p) => L.circleMarker(p, { radius: 4, color: d.color }).addTo(draftLayer));
  }
}

const isDraftValid = computed(() => {
  const d = draft.value;
  return d?.name && (d.shape === 'circle' ? d.center && d.radius >= 10 : d.points.length >= 3);
});

async function saveDraft() {
  const d = draft.value;
  const payload = {
    name: d.name, shape: d.shape, color: d.color,
    alertOnEnter: d.alertOnEnter, alertOnExit: d.alertOnExit, active: d.active,
    ...(d.shape === 'circle'
      ? { center: { type: 'Point', coordinates: [d.center[1], d.center[0]] }, radius: Number(d.radius), area: null }
      : { area: { type: 'Polygon', coordinates: [[...d.points, d.points[0]].map(([lat, lng]) => [lng, lat])] }, center: null, radius: null }),
  };
  saving.value = true;
  try {
    d._id ? await api.update(d._id, payload) : await api.create(payload);
    notify({ message: 'Zone enregistrée' });
    cancelDraft();
    await load();
  } catch (e) {
    notifyError(e);
  } finally {
    saving.value = false;
  }
}

async function removeZone(z) {
  if (!window.confirm(`Supprimer la zone « ${z.name} » ?`)) return;
  await api.remove(z._id).catch(notifyError);
  load();
}

// Redessiner le cercle quand le rayon change
watch(() => [draft.value?.radius, draft.value?.color], drawDraft);

onMounted(() => load().catch(notifyError));
</script>
