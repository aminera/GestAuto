<template>
  <div>
    <PageHeader :title="title" :subtitle="subtitle">
      <slot name="header-actions" />
      <AppButton v-if="auth.canWrite && !readonly" icon="plus" @click="openCreate">Ajouter</AppButton>
    </PageHeader>

    <!-- Filtres -->
    <div class="mb-4 flex flex-col gap-2 sm:flex-row">
      <div v-if="searchable" class="relative flex-1">
        <AppIcon name="search" :size="16" class="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
        <input v-model="filters.search" type="search" placeholder="Rechercher…" class="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
      </div>
      <select
        v-for="f in filterDefs"
        :key="f.name"
        v-model="filters[f.name]"
        class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
      >
        <option value="">{{ f.label }} : tous</option>
        <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </div>

    <DataTable
      v-model:page="page"
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :total="total"
      :limit="limit"
      :clickable="!!rowLink"
      @row-click="(r) => router.push(rowLink(r))"
    >
      <template v-for="(_, slot) in cellSlots" #[slot]="scope"><slot :name="slot" v-bind="scope" /></template>
      <template v-if="auth.canWrite && !readonly" #actions="{ row }">
        <slot name="row-actions" :row="row" />
        <AppButton size="sm" variant="ghost" icon="edit" aria-label="Modifier" @click="openEdit(row)" />
        <AppButton size="sm" variant="ghost" icon="trash" aria-label="Supprimer" class="text-red-600" @click="remove(row)" />
      </template>
    </DataTable>

    <!-- Formulaire création / édition -->
    <AppModal v-model:open="modalOpen" :title="editing ? `Modifier` : `Ajouter`">
      <form id="crud-form" class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="save">
        <FormField v-for="f in resolvedFields" :key="f.name" v-model="form[f.name]" :field="f" :error="errors[f.name]?.[0]" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="modalOpen = false">Annuler</AppButton>
        <AppButton type="submit" form="crud-form" :loading="saving">Enregistrer</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
/**
 * Page CRUD générique pilotée par configuration :
 *  - columns : colonnes du DataTable
 *  - fields  : champs du formulaire (type 'ref' → liste chargée depuis une autre ressource)
 *  - filters : listes déroulantes de filtre
 * Utilisée par Véhicules, Conducteurs, Traceurs, Maintenance, Documents, Utilisateurs.
 */
import { ref, computed, onMounted, useSlots } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useCrud } from '@/composables/useCrud';
import { notify, notifyError } from '@/composables/useToast';
import { resource as apiResource } from '@/services/api';
import { toInputDate, toInputDateTime } from '@/utils/format';
import PageHeader from '@/components/ui/PageHeader.vue';
import DataTable from '@/components/ui/DataTable.vue';
import AppButton from '@/components/ui/AppButton.vue';
import AppModal from '@/components/ui/AppModal.vue';
import AppIcon from '@/components/ui/AppIcon.vue';
import FormField from '@/components/ui/FormField.vue';

const props = defineProps({
  title: String,
  subtitle: String,
  resource: { type: String, required: true },
  columns: { type: Array, required: true },
  fields: { type: Array, default: () => [] },
  filters: { type: Array, default: () => [] },
  searchable: { type: Boolean, default: true },
  readonly: Boolean,
  defaults: { type: Object, default: () => ({}) },
  rowLink: Function,
  // Transforme le formulaire avant envoi (ex : supprimer un mot de passe vide)
  beforeSave: { type: Function, default: (d) => d },
});
const emit = defineEmits(['saved']);

const router = useRouter();
const auth = useAuthStore();
const slots = useSlots();
const cellSlots = computed(() => Object.fromEntries(Object.keys(slots).filter((s) => s.startsWith('cell-')).map((s) => [s, true])));

const { api, rows, total, loading, page, limit, filters, load } = useCrud(props.resource, {
  initialFilters: Object.fromEntries(props.filters.map((f) => [f.name, ''])),
});
const filterDefs = computed(() => props.filters);

// --- Champs de type "ref" : options chargées dynamiquement
const refOptions = ref({});
async function loadRefOptions() {
  for (const f of props.fields.filter((x) => x.type === 'ref')) {
    const { items } = await apiResource(f.resource).list({ limit: 500 });
    refOptions.value[f.name] = items.map((x) => ({ value: x._id, label: f.optionLabel(x) }));
  }
}
const resolvedFields = computed(() =>
  props.fields.map((f) => (f.type === 'ref' ? { ...f, type: 'select', options: refOptions.value[f.name] ?? [] } : f)),
);

// --- Formulaire
const modalOpen = ref(false);
const editing = ref(null);
const saving = ref(false);
const form = ref({});
const errors = ref({});

function toForm(row) {
  const out = {};
  for (const f of props.fields) {
    let v = row?.[f.name] ?? props.defaults[f.name] ?? (f.type === 'checkbox' ? false : null);
    if (f.type === 'ref' && v && typeof v === 'object') v = v._id;
    if (f.type === 'date') v = toInputDate(v);
    if (f.type === 'datetime-local') v = toInputDateTime(v);
    out[f.name] = v;
  }
  return out;
}

async function openCreate() {
  await loadRefOptions().catch(notifyError);
  editing.value = null;
  errors.value = {};
  form.value = toForm(null);
  modalOpen.value = true;
}

async function openEdit(row) {
  await loadRefOptions().catch(notifyError);
  editing.value = row;
  errors.value = {};
  form.value = toForm(row);
  modalOpen.value = true;
}

async function save() {
  saving.value = true;
  errors.value = {};
  try {
    const data = { ...form.value };
    for (const f of props.fields) {
      if (data[f.name] === '') data[f.name] = null;
      if (f.type === 'number' && data[f.name] != null) data[f.name] = Number(data[f.name]);
    }
    const payload = props.beforeSave(data, editing.value);
    editing.value ? await api.update(editing.value._id, payload) : await api.create(payload);
    notify({ message: 'Enregistré' });
    modalOpen.value = false;
    emit('saved');
    load();
  } catch (e) {
    errors.value = e.details ?? {};
    notifyError(e);
  } finally {
    saving.value = false;
  }
}

async function remove(row) {
  if (!window.confirm('Supprimer cet élément ?')) return;
  try {
    await api.remove(row._id);
    notify({ message: 'Supprimé' });
    load();
  } catch (e) {
    notifyError(e);
  }
}

onMounted(load);
defineExpose({ load, openEdit });
</script>
