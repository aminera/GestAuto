/**
 * Simulateur de boîtier Teltonika FMC920.
 * Se connecte au serveur TCP, s'identifie par IMEI, puis envoie des positions
 * Codec 8E le long d'un parcours, avec contact ON/OFF et odomètre.
 * Répond aussi aux commandes Codec 12 (getinfo, setdigout…).
 *
 * Usage : node scripts/simulator.js [IMEI] [hôte] [port]
 *   ou   : npm run simulate -- 356307042441013
 */
import net from 'node:net';
import { encodeAvlPacket8E, CODEC_12 } from '../src/teltonika/codec8.js';
import { encodeResponse } from '../src/teltonika/codec12.js';
import { haversineKm } from '../src/utils/geo.js';

const IMEI = process.argv[2] || '356307042441013';
const HOST = process.argv[3] || process.env.TCP_HOST || '127.0.0.1';
const PORT = Number(process.argv[4] || process.env.TCP_PORT || 5027);
const INTERVAL_MS = Number(process.env.SIM_INTERVAL_MS || 3000);

// Boucle dans Casablanca (lat, lng)
const ROUTE = [
  [33.5731, -7.5898], [33.5765, -7.5952], [33.5802, -7.6011], [33.5848, -7.6087],
  [33.5893, -7.6150], [33.5921, -7.6230], [33.5880, -7.6302], [33.5822, -7.6265],
  [33.5770, -7.6190], [33.5729, -7.6105], [33.5702, -7.6010], [33.5731, -7.5898],
];

let step = 0;
let odometerM = 125_000_000; // 125 000 km
let digout = 0;
let dout1 = 0;

const bearing = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b[1] - a[1])) * Math.cos(toRad(b[0]));
  const x = Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) - Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(toRad(b[1] - a[1]));
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
};

function nextRecord() {
  const cycle = step % (ROUTE.length + 3); // 3 pas à l'arrêt, contact coupé
  const moving = cycle < ROUTE.length - 1;
  const i = Math.min(cycle, ROUTE.length - 1);
  const cur = ROUTE[i];
  const nxt = ROUTE[Math.min(i + 1, ROUTE.length - 1)];
  const speed = moving ? 30 + Math.round(Math.random() * 70) : 0; // pics > 90 pour tester l'alerte
  if (moving) odometerM += Math.round(haversineKm({ lat: cur[0], lng: cur[1] }, { lat: nxt[0], lng: nxt[1] }) * 1000);
  step++;

  return {
    timestamp: new Date(),
    priority: 0,
    gps: { latitude: cur[0], longitude: cur[1], altitude: 40, angle: bearing(cur, nxt), satellites: 11, speed },
    eventIoId: 0,
    io: {
      239: { size: 1, value: moving ? 1 : 0 }, // Ignition
      240: { size: 1, value: moving ? 1 : 0 }, // Movement
      21: { size: 1, value: 4 }, // GSM signal
      69: { size: 1, value: 1 }, // GNSS status
      179: { size: 1, value: dout1 }, // DOUT1
      66: { size: 2, value: moving ? 13900 : 12600 }, // External voltage (mV)
      67: { size: 2, value: 4100 }, // Battery voltage (mV)
      24: { size: 2, value: speed },
      16: { size: 4, value: odometerM }, // Total odometer (m)
    },
  };
}

const socket = net.connect(PORT, HOST, () => {
  console.log(`→ Connecté à ${HOST}:${PORT}, envoi IMEI ${IMEI}`);
  const imei = Buffer.from(IMEI, 'ascii');
  const head = Buffer.alloc(2);
  head.writeUInt16BE(imei.length);
  socket.write(Buffer.concat([head, imei]));
});

let authenticated = false;
socket.on('data', (data) => {
  if (!authenticated) {
    if (data[0] !== 0x01) { console.error('✗ IMEI refusé par le serveur'); process.exit(1); }
    authenticated = true;
    console.log('✓ IMEI accepté, envoi des données…');
    const send = () => {
      const rec = nextRecord();
      socket.write(encodeAvlPacket8E([rec]));
      console.log(`  pos ${rec.gps.latitude},${rec.gps.longitude} ${rec.gps.speed} km/h contact=${rec.io[239].value}`);
    };
    send();
    setInterval(send, INTERVAL_MS);
    return;
  }
  if (data.length > 8 && data.readUInt8(8) === CODEC_12) {
    const size = data.readUInt32BE(11);
    const cmd = data.subarray(15, 15 + size).toString('ascii');
    console.log(`  ⇐ commande reçue : ${cmd}`);
    const m = cmd.match(/^setdigout\s+([01])/);
    if (m) { dout1 = Number(m[1]); digout = dout1; }
    const reply = cmd === 'getinfo' ? `INI:2026/10/02 RTC:${new Date().toISOString()} FMC920 SIM` : m ? `DOUT1:${digout} Timeout:INFINITY` : `Commande inconnue: ${cmd}`;
    socket.write(encodeResponse(reply));
    return;
  }
  // Acquittement : nombre d'enregistrements acceptés
  if (data.length === 4) return;
});

socket.on('close', () => { console.log('Connexion fermée'); process.exit(0); });
socket.on('error', (e) => { console.error(e.message); process.exit(1); });
