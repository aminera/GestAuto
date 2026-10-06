<template>
  <div class="relative flex h-full flex-col md:flex-row">
    <!-- Liste des véhicules -->
    <aside :class="['z-10 flex flex-col border-slate-200 bg-white md:w-80 md:border-r', listOpen ? 'h-1/2 border-b md:h-full' : 'h-auto md:h-full']">
      <div class="flex items-center gap-2 border-b border-slate-200 p-3">
        <input v-model="search" type="search" placeholder="Immatriculation, conducteur…" class="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <button class="rounded p-1.5 hover:bg-slate-100 md:hidden" @click="listOpen = !listOpen">{{ listOpen ? '▾' : '▴' }}</button>
      </div>
      <div class="flex flex-wrap gap-1 border-b border-slate-200 p-2">
        <button
          v-for="(s, key) in filtersDef"
          :key="key"
          :class="['rounded-full px-2.5 py-1 text-xs font-medium', stateFilter === key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']"
          @click="stateFilter = stateFilter === key ? '' : key"
        >{{ s.label }} <span class="opacity-70">{{ fleet.counts[key] }}</span></button>
      </div>
      <ul v-show="listOpen" class="flex-1 divide-y divide-slate-100 overflow-y-auto">
        <li
          v-for="v in filtered"
          :key="v._id"
          :class="['flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50', selectedId === v._id && 'bg-brand-50']"
          @click="selectedId = v._id"
        >
          <span class="h-3 w-3 shrink-0 rounded-full" :style="{ background: VEHICLE_STATES[vehicleState(v)].color }" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium">{{ v.plate }} <span class="font-normal text-slate-500">{{ v.brand }} {{ v.model }}</span></p>
            <p class="truncate text-xs text-slate-500">{{ driverName(v.driver) }} · {{ timeAgo(v.lastPosition?.timestamp) }}</p>
          </div>
          <span class="text-sm font-semibold tabular-nums">{{ v.lastPosition?.speed ?? 0 }}<span class="text-xs font-normal text-slate-500"> km/h</span></span>
        </li>
        <li v-if="!filtered.length" class="p-6 text-center text-sm text-slate-400">Aucun véhicule</li>
      </ul>
    </aside>

    <!-- Carte -->
    <div class="relative min-h-0 flex-1">
      <FleetMap :vehicles="filtered" :geofences="showZones ? geofences : []" :selected-id="selectedId" :follow="follow" @select="(id) => (selectedId = id)" />
      <div class="absolute top-3 right-3 z-[400] flex flex-col gap-1 rounded-lg bg-white p-2 text-sm shadow">
        <label class="flex items-center gap-2"><input v-model="showZones" type="checkbox" /> Zones</label>
        <label class="flex items-center gap-2"><input v-model="follow" type="checkbox" :disabled="!selectedId" /> Suivre</label>
      </div>
      <div v-if="selected" class="absolute right-3 bottom-3 left-3 z-[400] rounded-xl bg-white p-4 shadow-lg sm:left-auto sm:w-80">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-semibold">{{ selected.plate }}</p>
            <p class="text-xs text-slate-500">{{ selected.brand }} {{ selected.model }}</p>
          </div>
          <AppBadge :tone="VEHICLE_STATES[vehicleState(selected)].tone" dot>{{ VEHICLE_STATES[vehicleState(selected)].label }}</AppBadge>
        </div>
        <dl class="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div><dt class="text-xs text-slate-500">Vitesse</dt><dd>{{ formatSpeed(selected.lastPosition?.speed) }}</dd></div>
          <div><dt class="text-xs text-slate-500">Contact</dt><dd>{{ selected.lastPosition?.ignition ? 'ON' : 'OFF' }}</dd></div>
          <div><dt class="text-xs text-slate-500">Odomètre</dt><dd>{{ formatKm(selected.odometerKm) }}</dd></div>
          <div><dt class="text-xs text-slate-500">Satellites</dt><dd>{{ selected.lastPosition?.satellites ?? '—' }}</dd></div>
        </dl>
        <div class="mt-3 flex gap-2">
          <AppButton size="sm" :to="`/vehicles/${selected._id}`">Fiche</AppButton>
          <AppButton size="sm" variant="secondary" :to="{ path: '/trips', query: { vehicle: selected._id } }">Trajets</AppButton>
          <AppButton size="sm" variant="ghost" class="ml-auto" @click="selectedId = null">Fermer</AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useFleetStore } from '@/stores/fleet';
import { resource } from '@/services/api';
import { VEHICLE_STATES, vehicleState, driverName, timeAgo, formatSpeed, formatKm } from '@/utils/format';
import FleetMap from '@/components/map/FleetMap.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';

const fleet = useFleetStore();
const search = ref('');
const stateFilter = ref('');
const selectedId = ref(null);
const follow = ref(false);
const showZones = ref(true);
const listOpen = ref(true);
const geofences = ref([]);

const filtersDef = { moving: VEHICLE_STATES.moving, idle: VEHICLE_STATES.idle, stopped: VEHICLE_STATES.stopped, offline: VEHICLE_STATES.offline };

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return fleet.list.filter((v) =>
    (!stateFilter.value || vehicleState(v) === stateFilter.value)
    && (!q || [v.plate, v.brand, v.model, driverName(v.driver)].join(' ').toLowerCase().includes(q)));
});
const selected = computed(() => (selectedId.value ? fleet.vehicles[selectedId.value] : null));

onMounted(async () => {
  geofences.value = (await resource('geofences').list({ active: true, limit: 500 }).catch(() => ({ items: [] }))).items;
});
</script>
