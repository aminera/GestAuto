import { crc16 } from './crc16.js';
import { CODEC_12 } from './codec8.js';

const TYPE_COMMAND = 0x05;
const TYPE_RESPONSE = 0x06;

/**
 * Encode une commande GPRS Codec 12 (ex : "getinfo", "setdigout 1").
 */
export function encodeCommand(command) {
  const cmd = Buffer.from(command, 'ascii');
  const data = Buffer.alloc(1 + 1 + 1 + 4 + cmd.length + 1);
  let o = 0;
  data.writeUInt8(CODEC_12, o++);
  data.writeUInt8(1, o++); // quantity 1
  data.writeUInt8(TYPE_COMMAND, o++);
  data.writeUInt32BE(cmd.length, o); o += 4;
  cmd.copy(data, o); o += cmd.length;
  data.writeUInt8(1, o); // quantity 2

  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 4);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc16(data), 0);
  return Buffer.concat([header, data, crc]);
}

/**
 * Décode une réponse Codec 12 envoyée par le boîtier.
 * @returns {string|null} texte de la réponse
 */
export function decodeResponse(packet) {
  const dataLength = packet.readUInt32BE(4);
  const data = packet.subarray(8, 8 + dataLength);
  if (data.readUInt8(0) !== CODEC_12 || data.readUInt8(2) !== TYPE_RESPONSE) return null;
  const size = data.readUInt32BE(3);
  return data.subarray(7, 7 + size).toString('ascii');
}

/** Encode une réponse (utilisé par le simulateur). */
export function encodeResponse(text) {
  const packet = encodeCommand(text);
  // Même structure, seul le type change (0x05 → 0x06) : on recalcule le CRC.
  packet.writeUInt8(TYPE_RESPONSE, 10);
  const dataLength = packet.readUInt32BE(4);
  packet.writeUInt32BE(crc16(packet.subarray(8, 8 + dataLength)), 8 + dataLength);
  return packet;
}
