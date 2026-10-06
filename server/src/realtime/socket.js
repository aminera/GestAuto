import { Server } from 'socket.io';
import { verifyToken } from '../middleware/auth.js';
import { config } from '../config.js';
import { bus } from '../bus.js';
import { logger } from '../utils/logger.js';

/**
 * Diffusion temps réel vers le front.
 * Événements émis : 'position', 'device:status', 'alert'.
 * Le client peut s'abonner à un véhicule précis : socket.emit('subscribe', vehicleId)
 * pour recevoir 'vehicle:<id>:position' (page détail / suivi).
 */
export function attachSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: config.corsOrigin.split(',') } });

  io.use((socket, next) => {
    try {
      socket.user = verifyToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug({ user: socket.user.sub }, 'Client temps réel connecté');
    socket.join('fleet');
    socket.on('subscribe', (vehicleId) => socket.join(`vehicle:${vehicleId}`));
    socket.on('unsubscribe', (vehicleId) => socket.leave(`vehicle:${vehicleId}`));
  });

  bus.on('position', (p) => {
    io.to('fleet').emit('position', p);
    io.to(`vehicle:${p.vehicleId}`).emit('vehicle:position', p);
  });
  bus.on('device:status', (s) => io.to('fleet').emit('device:status', s));
  bus.on('alert', (a) => io.to('fleet').emit('alert', a));

  return io;
}
