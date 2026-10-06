import http from 'node:http';
import { config } from './config.js';
import { connectDb } from './db.js';
import { createApp } from './app.js';
import { attachSocket } from './realtime/socket.js';
import { createTeltonikaServer } from './teltonika/tcpServer.js';
import { authorizeDevice, handleRecords, setDeviceStatus } from './services/telemetryService.js';
import { startScheduler } from './services/scheduler.js';
import { Device } from './models/index.js';
import { logger } from './utils/logger.js';

async function main() {
  await connectDb();
  // Au démarrage, aucun boîtier n'est connecté
  await Device.updateMany({ online: true }, { online: false });

  // 1. Passerelle TCP Teltonika (FMC920)
  const gateway = createTeltonikaServer({
    authorize: authorizeDevice,
    onRecords: handleRecords,
    onStatus: (imei, online) => setDeviceStatus(imei, online).catch((err) => logger.error({ err }, 'setDeviceStatus')),
  });
  gateway.server.listen(config.tcpPort, () => logger.info(`Passerelle Teltonika TCP en écoute sur :${config.tcpPort}`));

  // 2. API REST + Socket.IO
  const httpServer = http.createServer(createApp(gateway));
  attachSocket(httpServer);
  httpServer.listen(config.httpPort, () => logger.info(`API HTTP en écoute sur :${config.httpPort}`));

  // 3. Tâches planifiées
  startScheduler();

  const shutdown = () => {
    logger.info('Arrêt en cours…');
    gateway.server.close();
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error({ err }, 'Échec du démarrage');
  process.exit(1);
});
