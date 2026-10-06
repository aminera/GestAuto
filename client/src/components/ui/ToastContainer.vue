<template>
  <div class="pointer-events-none fixed right-0 bottom-0 z-[60] flex w-full flex-col items-end gap-2 p-4 sm:max-w-sm">
    <TransitionGroup enter-from-class="translate-y-2 opacity-0" leave-to-class="opacity-0" enter-active-class="transition" leave-active-class="transition">
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="['pointer-events-auto w-full rounded-lg border-l-4 bg-white p-3 shadow-lg', borders[t.tone]]"
        @click="dismiss(t.id)"
      >
        <p v-if="t.title" class="text-sm font-semibold">{{ t.title }}</p>
        <p class="text-sm text-slate-600">{{ t.message }}</p>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { toasts, dismiss } from '@/composables/useToast';
const borders = { green: 'border-green-500', red: 'border-red-500', amber: 'border-amber-500', blue: 'border-blue-500' };
</script>
