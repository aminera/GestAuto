<template>
  <div>
    <PageHeader title="Tableau de bord" :subtitle="`Mis à jour ${timeAgo(updatedAt)}`">
      <AppButton variant="secondary" icon="map" to="/map">Ouvrir la carte</AppButton>
    </PageHeader>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Véhicules suivis" :value="fleet.list.length" icon="car" tone="slate" to="/vehicles" />
      <StatCard label="En mouvement" :value="fleet.counts.moving" icon="route" tone="green" to="/map" />
      <StatCard label="À l’arrêt / ralenti" :value="fleet.counts.stopped + fleet.counts.idle" icon="car" tone="blue" to="/map" />
      <StatCard label="Hors ligne" :value="fleet.counts.offline" icon="signal" tone="slate" to="/devices" />
      <StatCard label="Alertes non lues" :value="fleet.unreadAlerts" icon="bell" tone="red" to="/alerts" />
      <StatCard label="Trajets aujourd’hui" :value="data?.today.trips ?? '—'" icon="route" tone="blue" to="/trips" />
      <StatCard label="Km aujourd’hui" :value="data ? formatKm(data.today.distanceKm) : '—'" icon="route" tone="green" to="/trips" />
      <StatCard label="Échéances < 30 j" :value="data ? data.maintenanceDue + data.documentsDue : '—'" icon="wrench" tone="amber" to="/maintenance" />
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-5">
      <section class="h-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-3 lg:h-[420px]">
        <FleetMap :vehicles="fleet.list" @select="(id) => router.push(`/vehicles/${id}`)" />
      </section>

      <section class="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
        <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 class="font-semibold">Dernières alertes</h2>
          <RouterLink to="/alerts" class="text-sm text-brand-600 hover:underline">Tout voir</RouterLink>
        </header>
        <ul class="divide-y divide-slate-100">
          <li v-if="!alerts.length" class="px-4 py-8 text-center text-sm text-slate-400">Aucune alerte</li>
          <li v-for="a in alerts" :key="a._id" class="flex items-start gap-3 px-4 py-3">
            <AppBadge :tone="SEVERITY_TONE[a.severity]" dot>{{ ALERT_TYPE[a.type] }}</AppBadge>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm">{{ a.message }}</p>
              <p class="text-xs text-slate-500">{{ a.vehicle?.plate }} · {{ formatDateTime(a.occurredAt) }}</p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/services/api';
import { useFleetStore } from '@/stores/fleet';
import { notifyError } from '@/composables/useToast';
import { formatKm, formatDateTime, timeAgo } from '@/utils/format';
import { ALERT_TYPE, SEVERITY_TONE } from '@/utils/labels';
import PageHeader from '@/components/ui/PageHeader.vue';
import StatCard from '@/components/ui/StatCard.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';
import FleetMap from '@/components/map/FleetMap.vue';

const router = useRouter();
const fleet = useFleetStore();
const data = ref(null);
const updatedAt = ref(new Date());

// Alertes temps réel fusionnées avec celles chargées au démarrage
const alerts = computed(() => {
  const all = [...fleet.lastAlerts, ...(data.value?.latestAlerts ?? [])];
  return all.filter((a, i) => all.findIndex((b) => b._id === a._id) === i).slice(0, 8);
});

onMounted(async () => {
  try {
    data.value = await api.get('/dashboard');
    updatedAt.value = new Date();
  } catch (e) {
    notifyError(e);
  }
});
</script>
