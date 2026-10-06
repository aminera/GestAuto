import net from 'node:net';
import { decodeAvlPacket, expectedPacketLength, CODEC_12 } from './codec8.js';
import { encodeCommand, decodeResponse } from './codec12.js';
import { logger } from '../utils/logger.js';

/**
 * Serveur TCP Teltonika.
 *
 * Séquence :
 *  1. Le boîtier envoie l'IMEI : [2 octets longueur][IMEI ASCII]
 *  2. Le serveur répond 0x01 (accepté) ou 0x00 (refusé)
 *  3. Le boîtier envoie des paquets AVL (Codec 8 / 8E)
 *  4. Le serveur acquitte avec le nombre d'enregistrements reçus (4 octets BE)
 *     → sans acquittement, le boîtier renvoie les données (pas de perte).
 *
 * @param {object} opts
 * @param {(imei:string)=>Promise<boolean>} opts.authorize
 * @param {(imei:string, records:Array)=>Promise<void>} opts.onRecords
 * @param {(imei:string, online:boolean)=>void} [opts.onStatus]
 */
export function createTeltonikaServer({ authorize, onRecords, onStatus = () => {}, idleTimeoutMs = 10 * 60_000 }) {
  /** @type {Map<string, {socket: net.Socket, pending: Array}>} */
  const sessions = new Map();

  const server = net.createServer((socket) => {
    const remote = `${socket.remoteAddress}:${socket.remotePort}`;
    let imei = null;
    let buffer = Buffer.alloc(0);
    let processing = Promise.resolve();

    socket.setTimeout(idleTimeoutMs);
    socket.setKeepAlive(true, 60_000);

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      // Traitement séquentiel pour garantir l'ordre des acquittements
      processing = processing.then(drain).catch((err) => {
        logger.error({ err, imei, remote }, 'Erreur de traitement Teltonika');
        socket.destroy();
      });
    });

    async function drain() {
      while (buffer.length > 0) {
        // --- Étape 1 : identification par IMEI
        if (!imei) {
          if (buffer.length < 2) return;
          const len = buffer.readUInt16BE(0);
          if (len < 15 || len > 17) throw new Error(`Longueur IMEI invalide (${len})`);
          if (buffer.length < 2 + len) return;
          const candidate = buffer.subarray(2, 2 + len).toString('ascii');
          buffer = buffer.subarray(2 + len);

          const ok = await authorize(candidate);
          socket.write(Buffer.from([ok ? 0x01 : 0x00]));
          if (!ok) {
            logger.warn({ imei: candidate, remote }, 'IMEI refusé');
            socket.end();
            return;
          }
          imei = candidate;
          sessions.get(imei)?.socket.destroy(); // une seule session par boîtier
          sessions.set(imei, { socket, pending: [] });
          onStatus(imei, true);
          logger.info({ imei, remote }, 'Boîtier connecté');
          continue;
        }

        // Octet de ping éventuel
        if (buffer[0] === 0xff) { buffer = buffer.subarray(1); continue; }

        // --- Étape 2 : paquets de données
        const total = expectedPacketLength(buffer);
        if (total === null || buffer.length < total) return;
        const packet = buffer.subarray(0, total);
        buffer = buffer.subarray(total);

        const codec = packet.readUInt8(8);
        if (codec === CODEC_12) {
          const text = decodeResponse(packet);
          sessions.get(imei)?.pending.shift()?.resolve(text);
          continue;
        }

        const { records, crcValid } = decodeAvlPacket(packet);
        if (!crcValid) {
          logger.warn({ imei }, 'CRC invalide : paquet ignoré (le boîtier le renverra)');
          continue;
        }

        await onRecords(imei, records);
        const ack = Buffer.alloc(4);
        ack.writeUInt32BE(records.length, 0);
        socket.write(ack);
      }
    }

    const close = () => {
      if (imei && sessions.get(imei)?.socket === socket) {
        sessions.get(imei).pending.forEach((p) => p.reject(new Error('Déconnecté')));
        sessions.delete(imei);
        onStatus(imei, false);
        logger.info({ imei }, 'Boîtier déconnecté');
      }
    };
    socket.on('timeout', () => socket.destroy());
    socket.on('error', (err) => logger.debug({ err: err.message, imei }, 'Erreur socket'));
    socket.on('close', close);
  });

  /**
   * Envoie une commande GPRS (Codec 12) à un boîtier connecté.
   * @returns {Promise<string>} réponse du boîtier
   */
  function sendCommand(imei, command, timeoutMs = 20_000) {
    const session = sessions.get(imei);
    if (!session) return Promise.reject(new Error('Boîtier non connecté'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = session.pending.indexOf(entry);
        if (i >= 0) session.pending.splice(i, 1);
        reject(new Error('Délai dépassé'));
      }, timeoutMs);
      const entry = {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      };
      session.pending.push(entry);
      session.socket.write(encodeCommand(command));
    });
  }

  const isConnected = (imei) => sessions.has(imei);

  return { server, sendCommand, isConnected };
}
