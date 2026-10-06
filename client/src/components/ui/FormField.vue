<template>
  <label :class="['block', field.type === 'checkbox' && 'flex items-center gap-2', field.full && 'sm:col-span-2']">
    <span v-if="field.type !== 'checkbox'" class="mb-1 block text-sm font-medium text-slate-700">
      {{ field.label }} <span v-if="field.required" class="text-red-500">*</span>
    </span>

    <select v-if="field.type === 'select'" v-model="model" :required="field.required" :class="inputClass">
      <option v-if="!field.required" :value="null">—</option>
      <option v-for="o in field.options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>

    <textarea v-else-if="field.type === 'textarea'" v-model="model" rows="3" :placeholder="field.placeholder" :class="inputClass" />

    <input v-else-if="field.type === 'checkbox'" v-model="model" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600" />

    <input
      v-else
      v-model="model"
      :type="field.type || 'text'"
      :required="field.required"
      :placeholder="field.placeholder"
      :min="field.min"
      :max="field.max"
      :step="field.step"
      :class="inputClass"
    />

    <span v-if="field.type === 'checkbox'" class="text-sm text-slate-700">{{ field.label }}</span>
    <span v-if="error" class="mt-1 block text-xs text-red-600">{{ error }}</span>
    <span v-else-if="field.hint" class="mt-1 block text-xs text-slate-500">{{ field.hint }}</span>
  </label>
</template>

<script setup>
/**
 * Champ de formulaire générique piloté par une définition :
 * { name, label, type: text|number|email|date|datetime-local|select|textarea|checkbox|color, options, required, hint, full }
 */
defineProps({ field: { type: Object, required: true }, error: String });
const model = defineModel();

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
</script>
