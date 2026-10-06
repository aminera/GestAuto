<template>
  <component :is="to ? RouterLink : 'div'" :to="to" class="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow">
    <div :class="['flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', tones[tone]]"><AppIcon :name="icon" /></div>
    <div class="min-w-0">
      <p class="truncate text-sm text-slate-500">{{ label }}</p>
      <p class="text-2xl font-semibold">{{ value }}</p>
    </div>
  </component>
</template>

<script setup>
import { RouterLink } from 'vue-router';
import AppIcon from './AppIcon.vue';

defineProps({ label: String, value: [String, Number], icon: { type: String, default: 'car' }, tone: { type: String, default: 'blue' }, to: [String, Object] });
const tones = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600', slate: 'bg-slate-100 text-slate-600' };
</script>
