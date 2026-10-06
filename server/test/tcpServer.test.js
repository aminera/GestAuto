import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { createTeltonikaServer } from '../src/teltonika/tcpServer.js';
import { encodeAvlPacket8E } from '../src/teltonika/codec8.js';
import { encodeResponse } from '../src/teltonika/codec12.js';

test('Serveur TCP : handshake IMEI, acquittement AVL, commande Codec 12', async () => {
  const received = [];
  const { server, sendCommand } = createTeltonikaServer({
    authorize: async (imei) => imei === '356307042441013',
    onRecords: async (imei, recs) => { received.push(...recs); },
  });
  server.listen(0);
  await once(server, 'listening');
  const client = net.connect(server.address().port);
  await once(client, 'connect');

  const imei = Buffer.from('356307042441013');
  const head = Buffer.alloc(2); head.writeUInt16BE(imei.length);
  client.write(Buffer.concat([head, imei]));
  let [data] = await once(client, 'data');
  assert.equal(data[0], 0x01);

  const rec = { timestamp: new Date(), gps: { latitude: 33.5, longitude: -7.6, speed: 50 }, io: { 239: { size: 1, value: 1 } } };
  const pkt = encodeAvlPacket8E([rec, rec, rec]);
  client.write(pkt.subarray(0, 10)); // paquet fragmenté
  client.write(pkt.subarray(10));
  [data] = await once(client, 'data');
  assert.equal(data.readUInt32BE(0), 3);
  assert.equal(received.length, 3);

  const reply = sendCommand('356307042441013', 'getinfo');
  [data] = await once(client, 'data');
  assert.equal(data.readUInt8(8), 0x0c);
  client.write(encodeResponse('OK INFO'));
  assert.equal(await reply, 'OK INFO');

  client.destroy();
  server.close();
});
