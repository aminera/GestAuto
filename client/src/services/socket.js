import { io } from 'socket.io-client';
import { tokenStore } from './api';

let socket = null;

/** Connexion Socket.IO unique et authentifiée (JWT). */
export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
      auth: (cb) => cb({ token: tokenStore.get() }),
      transports: ['websocket'],
      reconnectionDelayMax: 10_000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
