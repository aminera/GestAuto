import { EventEmitter } from 'node:events';

/**
 * Bus d'événements interne : découple la passerelle Teltonika, les services
 * métier et la diffusion temps réel (Socket.IO).
 *
 * Événements :
 *  - 'position'      { vehicleId, deviceId, imei, position }
 *  - 'device:status' { deviceId, imei, online }
 *  - 'alert'         alerte créée (document Mongo)
 *
 * Pour passer à plusieurs instances, remplacer par Redis Pub/Sub
 * (et @socket.io/redis-adapter) sans toucher aux émetteurs.
 */
export const bus = new EventEmitter();
bus.setMaxListeners(50);
