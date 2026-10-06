<template>
  <div ref="el" class="h-full w-full" />
</template>

<script setup>
/**
 * Carte Leaflet + OpenStreetMap réutilisable.
 * Émet 'ready' avec l'instance L.Map ; les composants parents ajoutent leurs couches.
 */
import { ref, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import L from 'leaflet';

const props = defineProps({
  center: { type: Array, default: () => [33.5731, -7.5898] }, // Casablanca
  zoom: { type: Number, default: 12 },
});
const emit = defineEmits(['ready', 'click']);

const el = ref(null);
const map = shallowRef(null);
let resizeObserver;

onMounted(() => {
  map.value = L.map(el.value, { zoomControl: true }).setView(props.center, props.zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map.value);
  map.value.on('click', (e) => emit('click', e));
  // Recalcule la taille si le conteneur change (sidebar repliée, responsive)
  resizeObserver = new ResizeObserver(() => map.value?.invalidateSize());
  resizeObserver.observe(el.value);
  emit('ready', map.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  map.value?.remove();
});

defineExpose({ map });
</script>
