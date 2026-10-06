<template>
  <Teleport to="body">
    <Transition enter-from-class="opacity-0" leave-to-class="opacity-0" enter-active-class="transition" leave-active-class="transition">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" @mousedown.self="close">
        <div :class="['flex max-h-[95vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl', widths[size]]" role="dialog" aria-modal="true">
          <header class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 class="text-lg font-semibold">{{ title }}</h2>
            <button class="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Fermer" @click="close"><AppIcon name="x" /></button>
          </header>
          <div class="overflow-y-auto px-5 py-4"><slot /></div>
          <footer v-if="$slots.footer" class="flex justify-end gap-2 border-t border-slate-200 px-5 py-3"><slot name="footer" /></footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue';
import AppIcon from './AppIcon.vue';

defineProps({ title: String, size: { type: String, default: 'md' } });
const open = defineModel('open', { type: Boolean, default: false });
const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-2xl', lg: 'sm:max-w-4xl' };
const close = () => { open.value = false; };

const onKey = (e) => e.key === 'Escape' && close();
watch(open, (v) => (v ? window.addEventListener('keydown', onKey) : window.removeEventListener('keydown', onKey)));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>
