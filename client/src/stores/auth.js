import { defineStore } from 'pinia';
import { api, tokenStore } from '@/services/api';
import { disconnectSocket } from '@/services/socket';

export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null, token: tokenStore.get() }),
  getters: {
    isAuthenticated: (s) => !!s.token,
    canWrite: (s) => ['admin', 'manager'].includes(s.user?.role),
    isAdmin: (s) => s.user?.role === 'admin',
  },
  actions: {
    async login(email, password) {
      const { token, user } = await api.post('/auth/login', { email, password });
      tokenStore.set(token);
      this.token = token;
      this.user = user;
    },
    async fetchMe() {
      if (!this.token || this.user) return;
      this.user = await api.get('/auth/me');
    },
    logout() {
      tokenStore.clear();
      disconnectSocket();
      this.$reset();
      this.token = null;
    },
  },
});
