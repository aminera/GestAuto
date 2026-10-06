<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({ name: { type: String, required: true }, size: { type: [Number, String], default: 20 } });

// Icônes au trait (style "outline"), sans dépendance externe
const ICONS = {
  dashboard: ['M3 3h7v9H3z', 'M14 3h7v5h-7z', 'M14 12h7v9h-7z', 'M3 16h7v5H3z'],
  map: ['M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z', 'M9 4v14', 'M15 6v14'],
  car: ['M5 17h14v-5l-2-5H7l-2 5v5z', 'M5 12h14', 'M7 17v2', 'M17 17v2', 'M8 14.5h.01', 'M16 14.5h.01'],
  user: ['M20 21a8 8 0 0 0-16 0', 'M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z'],
  users: ['M17 21a6 6 0 0 0-12 0', 'M11 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 21a5 5 0 0 0-4-4.9', 'M16 3.1a4 4 0 0 1 0 7.8'],
  cpu: ['M6 6h12v12H6z', 'M9 9h6v6H9z', 'M9 2v4', 'M15 2v4', 'M9 18v4', 'M15 18v4', 'M2 9h4', 'M2 15h4', 'M18 9h4', 'M18 15h4'],
  route: ['M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7'],
  shape: ['M12 2 3 7v10l9 5 9-5V7z', 'M12 12 3 7', 'M12 12l9-5', 'M12 12v10'],
  bell: ['M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.9 1.9 0 0 0 3.4 0'],
  wrench: ['M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h5'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  x: ['M18 6 6 18', 'M6 6l12 12'],
  plus: ['M12 5v14', 'M5 12h14'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
  check: ['M20 6 9 17l-5-5'],
  edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6'],
  play: ['M6 4l14 8-14 8z'],
  pause: ['M7 4h3v16H7z', 'M14 4h3v16h-3z'],
  signal: ['M2 20h.01', 'M7 20v-4', 'M12 20v-8', 'M17 20V8', 'M22 4v16'],
  send: ['M22 2 11 13', 'M22 2l-7 20-4-9-9-4z'],
  chevronLeft: ['M15 18l-6-6 6-6'],
};

const paths = computed(() => ICONS[props.name] ?? []);
</script>
