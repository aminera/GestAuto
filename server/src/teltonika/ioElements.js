/**
 * Principaux éléments I/O du Teltonika FMC920 (firmware FMB/FMC).
 * Référence : https://wiki.teltonika-gps.com/view/FMC920_Teltonika_Data_Sending_Parameters_ID
 * `scale` convertit la valeur brute en unité métier.
 */
export const IO = {
  IGNITION: 239,
  MOVEMENT: 240,
  GSM_SIGNAL: 21,
  SLEEP_MODE: 200,
  GNSS_STATUS: 69,
  GNSS_PDOP: 181,
  GNSS_HDOP: 182,
  EXTERNAL_VOLTAGE: 66,
  BATTERY_VOLTAGE: 67,
  BATTERY_CURRENT: 68,
  BATTERY_LEVEL: 113,
  SPEED: 24,
  DIN1: 1,
  AIN1: 9,
  DOUT1: 179,
  TOTAL_ODOMETER: 16,
  TRIP_ODOMETER: 199,
  GSM_OPERATOR: 241,
  IBUTTON: 78,
  GREEN_DRIVING_TYPE: 253,
  GREEN_DRIVING_VALUE: 254,
  OVERSPEEDING: 255,
  CRASH_DETECTION: 247,
  TOWING: 246,
  JAMMING: 249,
  UNPLUG: 252,
  TRIP: 250,
};

const DEFS = {
  [IO.IGNITION]: { key: 'ignition', parse: (v) => v === 1 },
  [IO.MOVEMENT]: { key: 'movement', parse: (v) => v === 1 },
  [IO.GSM_SIGNAL]: { key: 'gsmSignal' },
  [IO.SLEEP_MODE]: { key: 'sleepMode' },
  [IO.GNSS_STATUS]: { key: 'gnssStatus' },
  [IO.GNSS_PDOP]: { key: 'pdop', parse: (v) => v / 10 },
  [IO.GNSS_HDOP]: { key: 'hdop', parse: (v) => v / 10 },
  [IO.EXTERNAL_VOLTAGE]: { key: 'externalVoltage', parse: (v) => v / 1000 }, // V
  [IO.BATTERY_VOLTAGE]: { key: 'batteryVoltage', parse: (v) => v / 1000 }, // V
  [IO.BATTERY_CURRENT]: { key: 'batteryCurrent', parse: (v) => v / 1000 }, // A
  [IO.BATTERY_LEVEL]: { key: 'batteryLevel' }, // %
  [IO.SPEED]: { key: 'gnssSpeed' },
  [IO.DIN1]: { key: 'din1', parse: (v) => v === 1 },
  [IO.AIN1]: { key: 'ain1', parse: (v) => v / 1000 },
  [IO.DOUT1]: { key: 'dout1', parse: (v) => v === 1 },
  [IO.TOTAL_ODOMETER]: { key: 'totalOdometerKm', parse: (v) => v / 1000 },
  [IO.TRIP_ODOMETER]: { key: 'tripOdometerKm', parse: (v) => v / 1000 },
  [IO.GSM_OPERATOR]: { key: 'gsmOperator' },
  [IO.IBUTTON]: { key: 'ibutton', parse: (v) => (v ? BigInt(v).toString(16).padStart(16, '0') : null) },
  [IO.GREEN_DRIVING_TYPE]: { key: 'greenDrivingType' }, // 1 accél., 2 freinage, 3 virage
  [IO.GREEN_DRIVING_VALUE]: { key: 'greenDrivingValue' },
  [IO.OVERSPEEDING]: { key: 'overspeeding' },
  [IO.CRASH_DETECTION]: { key: 'crash' },
  [IO.TOWING]: { key: 'towing' },
  [IO.JAMMING]: { key: 'jamming' },
  [IO.UNPLUG]: { key: 'unplug', parse: (v) => v === 1 },
  [IO.TRIP]: { key: 'tripEvent' },
};

/**
 * Transforme le dictionnaire brut {id: valeur} en objet lisible.
 * Les ID inconnus sont conservés sous la forme `io<ID>`.
 */
export function humanizeIo(io) {
  const out = {};
  for (const [id, raw] of Object.entries(io)) {
    const def = DEFS[id];
    if (def) out[def.key] = def.parse ? def.parse(raw) : raw;
    else out[`io${id}`] = raw;
  }
  return out;
}
