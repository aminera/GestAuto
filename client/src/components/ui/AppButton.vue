<template>
  <component
    :is="to ? RouterLink : 'button'"
    :to="to"
    :type="to ? undefined : type"
    :disabled="disabled || loading"
    :class="[base, variants[variant], sizes[size]]"
  >
    <svg v-if="loading" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" />
    </svg>
    <AppIcon v-else-if="icon" :name="icon" :size="size === 'sm' ? 16 : 18" />
    <slot />
  </component>
</template>

<script setup>
import { RouterLink } from 'vue-router';
import AppIcon from './AppIcon.vue';

defineProps({
  variant: { type: String, default: 'primary' }, // primary | secondary | danger | ghost
  size: { type: String, default: 'md' }, // sm | md
  type: { type: String, default: 'button' },
  icon: String,
  to: [String, Object],
  loading: Boolean,
  disabled: Boolean,
});

const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed';
const variants = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-slate-600 hover:bg-slate-100',
};
const sizes = { sm: 'px-2.5 py-1.5 text-sm', md: 'px-4 py-2 text-sm' };
</script>
