<template>
  <span :class="['inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', tones[tone]]">
    <span v-if="dot" :class="['h-1.5 w-1.5 rounded-full', dots[tone]]" />
    <slot />
  </span>
</template>

<script setup>
defineProps({ tone: { type: String, default: 'slate' }, dot: Boolean });
const tones = {
  slate: 'bg-slate-100 text-slate-700', green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800', blue: 'bg-blue-100 text-blue-800',
};
const dots = { slate: 'bg-slate-400', green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500', blue: 'bg-blue-500' };
</script>
