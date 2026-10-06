/**
 * CRC-16/IBM (aussi appelé CRC-16/ARC) utilisé par Teltonika.
 * Polynôme 0xA001 (forme réfléchie de 0x8005), valeur initiale 0x0000.
 * Calculé depuis le champ "Codec ID" jusqu'au "Number of Data 2" inclus.
 */
export function crc16(buffer) {
  let crc = 0x0000;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
    }
  }
  return crc & 0xffff;
}
