<template>
  <div class="flex h-full">
    <!-- Overlay mobile -->
    <div v-if="menuOpen" class="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" @click="menuOpen = false" />

    <!-- Barre latérale -->
    <aside
      :class="['fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-slate-300 transition-transform lg:static lg:translate-x-0', menuOpen ? 'translate-x-0' : '-translate-x-full']"
    >
      <div class="flex h-16 items-center gap-2 px-5 text-white">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600"><AppIcon name="car" :size="18" /></div>
        <span class="text-lg font-semibold">GestAuto</span>
      </div>
      <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        <template v-for="group in nav" :key="group.title">
          <p class="px-3 pt-4 pb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">{{ group.title }}</p>
          <RouterLink
            v-for="item in group.items.filter((i) => !i.admin || auth.isAdmin)"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-800 hover:text-white"
            exact-active-class="bg-slate-800 text-white"
            @click="menuOpen = false"
          >
            <AppIcon :name="item.icon" :size="18" />
            <span class="flex-1">{{ item.label }}</span>
            <AppBadge v-if="item.to === '/alerts' && fleet.unreadAlerts" tone="red">{{ fleet.unreadAlerts }}</AppBadge>
          </RouterLink>
        </template>
      </nav>
      <div class="border-t border-slate-800 p-3">
        <div class="flex items-center gap-3 px-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">{{ initials }}</div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm text-white">{{ auth.user?.name }}</p>
            <p class="truncate text-xs text-slate-500">{{ ROLES[auth.user?.role] }}</p>
          </div>
          <button class="rounded p-1.5 hover:bg-slate-800" title="Déconnexion" @click="logout"><AppIcon name="logout" :size="18" /></button>
        </div>
      </div>
    </aside>

    <!-- Contenu -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <button class="rounded p-1.5 hover:bg-slate-100 lg:hidden" aria-label="Menu" @click="menuOpen = true"><AppIcon name="menu" /></button>
        <h1 class="flex-1 truncate font-semibold">{{ route.meta.title }}</h1>
        <span :class="['hidden items-center gap-1.5 text-xs sm:flex', fleet.connected ? 'text-green-600' : 'text-slate-400']">
          <span :class="['h-2 w-2 rounded-full', fleet.connected ? 'bg-green-500 animate-pulse' : 'bg-slate-300']" />
          {{ fleet.connected ? 'Temps réel actif' : 'Hors connexion' }}
        </span>
        <RouterLink to="/alerts" class="relative rounded p-1.5 hover:bg-slate-100" aria-label="Alertes">
          <AppIcon name="bell" />
          <span v-if="fleet.unreadAlerts" class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{{ fleet.unreadAlerts > 99 ? '99+' : fleet.unreadAlerts }}</span>
        </RouterLink>
      </header>
      <main :class="['min-h-0 flex-1', route.meta.fullscreen ? 'overflow-hidden' : 'overflow-y-auto p-4 sm:p-6']">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useFleetStore } from '@/stores/fleet';
import { notifyError } from '@/composables/useToast';
import { ROLES } from '@/utils/labels';
import AppIcon from '@/components/ui/AppIcon.vue';
import AppBadge from '@/components/ui/AppBadge.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const fleet = useFleetStore();
const menuOpen = ref(false);

const nav = [
  { title: 'Suivi', items: [
    { to: '/', label: 'Tableau de bord', icon: 'dashboard' },
    { to: '/map', label: 'Carte temps réel', icon: 'map' },
    { to: '/trips', label: 'Trajets', icon: 'route' },
    { to: '/alerts', label: 'Alertes', icon: 'bell' },
    { to: '/geofences', label: 'Zones', icon: 'shape' },
  ] },
  { title: 'Flotte', items: [
    { to: '/vehicles', label: 'Véhicules', icon: 'car' },
    { to: '/drivers', label: 'Conducteurs', icon: 'user' },
    { to: '/devices', label: 'Traceurs', icon: 'cpu' },
    { to: '/maintenance', label: 'Maintenance', icon: 'wrench' },
    { to: '/documents', label: 'Documents', icon: 'file' },
  ] },
  { title: 'Administration', items: [{ to: '/users', label: 'Utilisateurs', icon: 'users', admin: true }] },
];

const initials = computed(() => (auth.user?.name ?? '?').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase());

function logout() {
  auth.logout();
  router.push('/login');
}

onMounted(() => {
  fleet.load().catch(notifyError);
  fleet.listen();
});
</script>
