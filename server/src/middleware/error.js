import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (_req, _res, next) => next(new HttpError(404, 'Ressource introuvable'));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Données invalides', details: err.flatten().fieldErrors });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: 'Données invalides', details: Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, [v.message]])) });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: `Identifiant invalide : ${err.value}` });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: 'Valeur déjà utilisée', details: err.keyValue });
  }
  const status = err.status || 500;
  if (status >= 500) logger.error({ err }, 'Erreur serveur');
  res.status(status).json({ error: status >= 500 ? 'Erreur interne' : err.message, details: err.details });
}
