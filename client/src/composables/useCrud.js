import { ref, reactive, watch } from 'vue';
import { resource } from '@/services/api';
import { notifyError } from './useToast';

/**
 * Logique de liste paginée + filtres pour une ressource REST.
 * Réutilisé par CrudPage et par les vues spécifiques.
 */
export function useCrud(name, { limit = 25, initialFilters = {} } = {}) {
  const api = resource(name);
  const rows = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const page = ref(1);
  const filters = reactive({ search: '', ...initialFilters });

  let debounce;
  async function load() {
    loading.value = true;
    try {
      const res = await api.list({ page: page.value, limit, ...filters });
      rows.value = res.items;
      total.value = res.total ?? res.items.length;
    } catch (e) {
      notifyError(e);
    } finally {
      loading.value = false;
    }
  }

  watch(page, load);
  watch(filters, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { page.value === 1 ? load() : (page.value = 1); }, 250);
  });

  return { api, rows, total, loading, page, limit, filters, load };
}
