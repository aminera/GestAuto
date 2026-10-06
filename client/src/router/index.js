import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AppLayout from '@/components/layout/AppLayout.vue';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true } },
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: 'Tableau de bord' }
      },
      {
        path: 'map',
        name: 'map',
        component: () => import('@/views/LiveMapView.vue'),
        meta: { title: 'Carte temps réel', fullscreen: true }
      },
      {
        path: 'vehicles',
        name: 'vehicles',
        component: () => import('@/views/VehiclesView.vue'),
        meta: { title: 'Véhicules' }
      },
      {
        path: 'vehicles/:id',
        name: 'vehicle',
        component: () => import('@/views/VehicleDetailView.vue'),
        meta: { title: 'Véhicule' }
      },
      {
        path: 'drivers',
        name: 'drivers',
        component: () => import('@/views/DriversView.vue'),
        meta: { title: 'Conducteurs' }
      },
      {
        path: 'devices',
        name: 'devices',
        component: () => import('@/views/DevicesView.vue'),
        meta: { title: 'Traceurs' }
      },
      {
        path: 'trips',
        name: 'trips',
        component: () => import('@/views/TripsView.vue'),
        meta: { title: 'Trajets' }
      },
      {
        path: 'trips/:id',
        name: 'trip',
        component: () => import('@/views/TripReplayView.vue'),
        meta: { title: 'Replay du trajet', fullscreen: true }
      },
      {
        path: 'geofences',
        name: 'geofences',
        component: () => import('@/views/GeofencesView.vue'),
        meta: { title: 'Zones (géofencing)', fullscreen: true }
      },
      {
        path: 'alerts',
        name: 'alerts',
        component: () => import('@/views/AlertsView.vue'),
        meta: { title: 'Alertes' }
      },
      {
        path: 'maintenance',
        name: 'maintenance',
        component: () => import('@/views/MaintenanceView.vue'),
        meta: { title: 'Maintenance' }
      },
      {
        path: 'documents',
        name: 'documents',
        component: () => import('@/views/DocumentsView.vue'),
        meta: { title: 'Documents' }
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/views/UsersView.vue'),
        meta: { title: 'Utilisateurs', admin: true }
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (to.meta.public) return true;
  if (!auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } };
  try { await auth.fetchMe(); } catch { auth.logout(); return { name: 'login' }; }
  if (to.meta.admin && !auth.isAdmin) return { name: 'dashboard' };
  return true;
});

router.afterEach((to) => {
  document.title = `${to.meta.title ? `${to.meta.title} · ` : ''}GestAuto`;
});

export default router;
