import { crc16 } from './crc16.js';

export const CODEC_8 = 0x08;
export const CODEC_8E = 0x8e;
export const CODEC_12 = 0x0c;

/**
 * Lit l'en-tête d'un paquet AVL TCP pour savoir s'il est complet.
 * Format : 4 octets préambule (0x00000000) + 4 octets longueur des données
 *          + données (codec → number of data 2) + 4 octets CRC.
 * @returns {number|null} taille totale attendue du paquet, ou null si en-tête incomplet.
 */
export function expectedPacketLength(buf) {
  if (buf.length < 8) return null;
  const dataLength = buf.readUInt32BE(4);
  return 8 + dataLength + 4;
}

/**
 * Décode un paquet AVL Codec 8 ou Codec 8 Extended (TCP).
 * @param {Buffer} packet paquet complet (préambule inclus)
 * @returns {{ codec:number, records:Array, crcValid:boolean }}
 */
export function decodeAvlPacket(packet) {
  const preamble = packet.readUInt32BE(0);
  if (preamble !== 0) throw new Error('Préambule invalide');

  const dataLength = packet.readUInt32BE(4);
  const data = packet.subarray(8, 8 + dataLength);
  const crcReceived = packet.readUInt32BE(8 + dataLength) & 0xffff;
  const crcValid = crc16(data) === crcReceived;

  let o = 0;
  const codec = data.readUInt8(o); o += 1;
  if (codec !== CODEC_8 && codec !== CODEC_8E) {
    return { codec, records: [], crcValid };
  }
  const ext = codec === CODEC_8E;
  const count1 = data.readUInt8(o); o += 1;

  // Lecteurs dépendant du codec : 1 octet en Codec 8, 2 octets en Codec 8E
  const readId = () => {
    const v = ext ? data.readUInt16BE(o) : data.readUInt8(o);
    o += ext ? 2 : 1;
    return v;
  };
  const readCount = readId;

  const records = [];
  for (let r = 0; r < count1; r++) {
    const timestamp = new Date(Number(data.readBigUInt64BE(o))); o += 8;
    const priority = data.readUInt8(o); o += 1;

    const gps = {
      longitude: data.readInt32BE(o) / 1e7,
      latitude: data.readInt32BE(o + 4) / 1e7,
      altitude: data.readInt16BE(o + 8),
      angle: data.readUInt16BE(o + 10),
      satellites: data.readUInt8(o + 12),
      speed: data.readUInt16BE(o + 13), // km/h
    };
    o += 15;

    const eventIoId = readId();
    readCount(); // N total (non utilisé : on lit chaque groupe)
    const io = {};

    for (const size of [1, 2, 4, 8]) {
      const n = readCount();
      for (let i = 0; i < n; i++) {
        const id = readId();
        let value;
        switch (size) {
          case 1: value = data.readUInt8(o); break;
          case 2: value = data.readUInt16BE(o); break;
          case 4: value = data.readUInt32BE(o); break;
          case 8: {
            const big = data.readBigUInt64BE(o);
            value = big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big.toString();
            break;
          }
        }
        o += size;
        io[id] = value;
      }
    }

    // Éléments de longueur variable (Codec 8E uniquement)
    if (ext) {
      const nx = data.readUInt16BE(o); o += 2;
      for (let i = 0; i < nx; i++) {
        const id = data.readUInt16BE(o); o += 2;
        const len = data.readUInt16BE(o); o += 2;
        io[id] = data.subarray(o, o + len).toString('hex');
        o += len;
      }
    }

    records.push({ timestamp, priority, gps, eventIoId, io });
  }

  const count2 = data.readUInt8(o);
  if (count1 !== count2) throw new Error('Number of Data 1 ≠ Number of Data 2');

  return { codec, records, crcValid };
}

/**
 * Encode un paquet Codec 8E (utilisé par le simulateur et les tests).
 */
export function encodeAvlPacket8E(records) {
  const parts = [Buffer.from([CODEC_8E, records.length])];
  for (const rec of records) {
    const head = Buffer.alloc(8 + 1 + 15);
    head.writeBigUInt64BE(BigInt(rec.timestamp.getTime()), 0);
    head.writeUInt8(rec.priority ?? 0, 8);
    head.writeInt32BE(Math.round(rec.gps.longitude * 1e7), 9);
    head.writeInt32BE(Math.round(rec.gps.latitude * 1e7), 13);
    head.writeInt16BE(rec.gps.altitude ?? 0, 17);
    head.writeUInt16BE(rec.gps.angle ?? 0, 19);
    head.writeUInt8(rec.gps.satellites ?? 0, 21);
    head.writeUInt16BE(rec.gps.speed ?? 0, 22);
    parts.push(head);

    const groups = { 1: [], 2: [], 4: [], 8: [] };
    for (const [id, { size, value }] of Object.entries(rec.io ?? {})) {
      groups[size].push([Number(id), value]);
    }
    const total = Object.values(groups).reduce((s, g) => s + g.length, 0);
    const ioHead = Buffer.alloc(4);
    ioHead.writeUInt16BE(rec.eventIoId ?? 0, 0);
    ioHead.writeUInt16BE(total, 2);
    parts.push(ioHead);

    for (const size of [1, 2, 4, 8]) {
      const g = groups[size];
      const b = Buffer.alloc(2 + g.length * (2 + size));
      b.writeUInt16BE(g.length, 0);
      let p = 2;
      for (const [id, value] of g) {
        b.writeUInt16BE(id, p); p += 2;
        if (size === 1) b.writeUInt8(value, p);
        if (size === 2) b.writeUInt16BE(value, p);
        if (size === 4) b.writeUInt32BE(value, p);
        if (size === 8) b.writeBigUInt64BE(BigInt(value), p);
        p += size;
      }
      parts.push(b);
    }
    parts.push(Buffer.from([0x00, 0x00])); // NX = 0
  }
  parts.push(Buffer.from([records.length]));

  const data = Buffer.concat(parts);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 4);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc16(data), 0);
  return Buffer.concat([header, data, crc]);
}
