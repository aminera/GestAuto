/**
 * Logger minimaliste sans dépendance (remplaçable par pino en production).
 * Usage : logger.info({ imei }, 'message')
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function log(level, ctx, msg) {
  if (LEVELS[level] < threshold) return;
  if (typeof ctx === 'string') [ctx, msg] = [{}, ctx];
  if (ctx?.err instanceof Error) ctx = { ...ctx, err: ctx.err.stack || ctx.err.message };
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${msg}`;
  const extra = ctx && Object.keys(ctx).length ? ` ${JSON.stringify(ctx)}` : '';
  (level === 'error' ? console.error : console.log)(line + extra);
}

export const logger = Object.fromEntries(Object.keys(LEVELS).map((l) => [l, (ctx, msg) => log(l, ctx, msg)]));
