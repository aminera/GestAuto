import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeAvlPacket, encodeAvlPacket8E } from '../src/teltonika/codec8.js';
import { encodeCommand, decodeResponse, encodeResponse } from '../src/teltonika/codec12.js';
import { humanizeIo } from '../src/teltonika/ioElements.js';
import { isInsideGeofence } from '../src/utils/geo.js';

const hex = (s) => Buffer.from(s, 'hex');

test('Codec 8 — exemple officiel Teltonika', () => {
  const p = hex('000000000000003608010000016B40D8EA30010000000000000000000000000000000105021503010101425E0F01F10000601A014E0000000000000000010000C7CF');
  const { codec, records, crcValid } = decodeAvlPacket(p);
  assert.equal(codec, 0x08);
  assert.equal(crcValid, true);
  assert.equal(records.length, 1);
  assert.equal(records[0].timestamp.toISOString(), '2019-06-10T10:04:46.000Z');
  assert.deepEqual(records[0].io, { 21: 3, 1: 1, 66: 0x5e0f, 241: 0x601a, 78: 0 });
});

test('Codec 8 Extended — exemple officiel Teltonika', () => {
  const p = hex('000000000000004A8E010000016B412CEE000100000000000000000000000000000000010005000100010100010011001D00010010015E2C880002000B000000003544C87A000E000000001DD7E06A00000100002994');
  const { codec, records, crcValid } = decodeAvlPacket(p);
  assert.equal(codec, 0x8e);
  assert.equal(crcValid, true);
  assert.equal(records[0].io[16], 0x015e2c88);
  assert.equal(records[0].io[11], 0x3544c87a);
});

test('Codec 8E — aller-retour encodage/décodage', () => {
  const rec = {
    timestamp: new Date('2026-10-02T08:00:00Z'),
    gps: { latitude: 33.5731104, longitude: -7.5898434, altitude: 50, angle: 90, satellites: 12, speed: 72 },
    eventIoId: 239,
    io: { 239: { size: 1, value: 1 }, 66: { size: 2, value: 12850 }, 16: { size: 4, value: 123456 } },
  };
  const { records, crcValid } = decodeAvlPacket(encodeAvlPacket8E([rec, rec]));
  assert.equal(crcValid, true);
  assert.equal(records.length, 2);
  assert.equal(records[0].gps.latitude, 33.5731104);
  assert.equal(records[0].gps.speed, 72);
  const h = humanizeIo(records[0].io);
  assert.equal(h.ignition, true);
  assert.equal(h.externalVoltage, 12.85);
  assert.equal(h.totalOdometerKm, 123.456);
});

test('Codec 12 — commande getinfo (exemple officiel)', () => {
  assert.equal(encodeCommand('getinfo').toString('hex').toUpperCase(), '000000000000000F0C010500000007676574696E666F0100004312');
  assert.equal(decodeResponse(encodeResponse('RTC:2026/10/02')), 'RTC:2026/10/02');
});

test('Géofences cercle et polygone', () => {
  const circle = { shape: 'circle', center: { coordinates: [-7.59, 33.57] }, radius: 500 };
  assert.equal(isInsideGeofence({ lat: 33.571, lng: -7.59 }, circle), true);
  assert.equal(isInsideGeofence({ lat: 33.60, lng: -7.59 }, circle), false);
  const poly = { shape: 'polygon', area: { coordinates: [[[-7.6, 33.5], [-7.5, 33.5], [-7.5, 33.6], [-7.6, 33.6], [-7.6, 33.5]]] } };
  assert.equal(isInsideGeofence({ lat: 33.55, lng: -7.55 }, poly), true);
  assert.equal(isInsideGeofence({ lat: 33.65, lng: -7.55 }, poly), false);
});
