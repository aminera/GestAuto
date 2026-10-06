import { defineStore } from 'pinia';
import { api } from '@/services/api';
import { getSocket } from '@/services/socket';
import { notify } from '@/composables/useToast';
import { vehicleState } from '@/utils/format';

let boundSocket = null;

/**
 * État temps réel de la flotte : chargé une fois via REST (/vehicles/live)
 * puis maintenu à jour par Socket.IO (position, device:status, alert).
 */
export const useFleetStore = defineStore('fleet', {
  state: () => ({
    vehicles: {}, // { [id]: vehicle }
    loaded: false,
    connected: false,
    unreadAlerts: 0,
    lastAlerts: [],
    listening: false,
  }),
  getters: {
    list: (s) => Object.values(s.vehicles).sort((a, b) => a.plate.localeCompare(b.plate)),
    counts() {
      const c = { moving: 0, idle: 0, stopped: 0, offline: 0, nodevice: 0 };
      this.list.forEach((v) => c[vehicleState(v)]++);
      return c;
    },
  },
  actions: {
    async load() {
      const [{ items }, alerts] = await Promise.all([api.get('/vehicles/live'), api.get('/alerts', { acknowledged: false, limit: 1 })]);
      this.vehicles = Object.fromEntries(items.map((v) => [v._id, v]));
      this.unreadAlerts = alerts.unread;
      this.loaded = true;
    },
    listen() {
      // Une nouvelle socket est créée après chaque reconnexion utilisateur
      const socket = getSocket();
      if (boundSocket === socket) return;
      boundSocket = socket;
      this.listening = true;
      socket.on('connect', () => { this.connected = true; });
      socket.on('disconnect', () => { this.connected = false; });

      socket.on('position', (p) => {
        const v = this.vehicles[p.vehicleId];
        if (!v) return;
        v.lastPosition = p.lastPosition;
        v.odometerKm = p.odometerKm;
        if (v.device) { v.device.online = true; v.device.lastSeenAt = new Date().toISOString(); v.device.lastIo = p.io; }
      });

      socket.on('device:status', (s) => {
        const v = s.vehicleId && this.vehicles[s.vehicleId];
        if (v?.device) v.device.online = s.online;
      });

      socket.on('alert', (a) => {
        this.unreadAlerts++;
        this.lastAlerts = [a, ...this.lastAlerts].slice(0, 20);
        notify({ title: a.vehicle?.plate ?? 'Alerte', message: a.message, tone: a.severity === 'critical' ? 'red' : a.severity === 'warning' ? 'amber' : 'blue' });
      });
    },
  },
});
