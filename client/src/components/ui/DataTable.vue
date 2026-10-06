<template>
  <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th
              v-for="c in columns"
              :key="c.key"
              :class="['px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap', c.hideOnMobile && 'hidden md:table-cell', c.align === 'right' && 'text-right']"
            >{{ c.label }}</th>
            <th v-if="$slots.actions" class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading"><td :colspan="colspan" class="px-4 py-8 text-center text-slate-400">Chargement…</td></tr>
          <tr v-else-if="!rows.length"><td :colspan="colspan" class="px-4 py-8 text-center text-slate-400">{{ emptyText }}</td></tr>
          <template v-else>
          <tr
            v-for="row in rows"
            :key="row._id"
            :class="['hover:bg-slate-50', clickable && 'cursor-pointer']"
            @click="clickable && $emit('row-click', row)"
          >
            <td
              v-for="c in columns"
              :key="c.key"
              :class="['px-4 py-3 whitespace-nowrap', c.hideOnMobile && 'hidden md:table-cell', c.align === 'right' && 'text-right']"
            >
              <slot :name="`cell-${c.key}`" :row="row" :value="get(row, c.key)">
                {{ c.format ? c.format(get(row, c.key), row) : (get(row, c.key) ?? '—') }}
              </slot>
            </td>
            <td v-if="$slots.actions" class="px-4 py-2 text-right whitespace-nowrap" @click.stop>
              <slot name="actions" :row="row" />
            </td>
          </tr>
          </template>
        </tbody>
      </table>
    </div>
    <footer v-if="total > limit" class="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-sm text-slate-600">
      <span>{{ (page - 1) * limit + 1 }}–{{ Math.min(page * limit, total) }} sur {{ total }}</span>
      <div class="flex gap-1">
        <AppButton size="sm" variant="secondary" :disabled="page <= 1" @click="$emit('update:page', page - 1)">Précédent</AppButton>
        <AppButton size="sm" variant="secondary" :disabled="page * limit >= total" @click="$emit('update:page', page + 1)">Suivant</AppButton>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, useSlots } from 'vue';
import AppButton from './AppButton.vue';

/**
 * Tableau générique. columns : [{ key: 'device.imei', label, format?, hideOnMobile?, align? }]
 * Slots : cell-<key> (rendu personnalisé), actions (boutons de ligne).
 */
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  loading: Boolean,
  clickable: Boolean,
  emptyText: { type: String, default: 'Aucune donnée' },
  page: { type: Number, default: 1 },
  limit: { type: Number, default: 25 },
  total: { type: Number, default: 0 },
});
defineEmits(['row-click', 'update:page']);

const slots = useSlots();
const colspan = computed(() => props.columns.length + (slots.actions ? 1 : 0));
const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
</script>
