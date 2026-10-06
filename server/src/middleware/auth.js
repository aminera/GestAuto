import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from './error.js';

export const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role, name: user.name }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

export const verifyToken = (token) => jwt.verify(token, config.jwtSecret);

/** Exige un JWT valide (en-tête Authorization: Bearer <token>). */
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Authentification requise');
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role, name: payload.name };
    next();
  } catch {
    throw new HttpError(401, 'Jeton invalide ou expiré');
  }
}

/** Restreint l'accès à certains rôles. Hiérarchie : admin > manager > viewer. */
export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user?.role)) throw new HttpError(403, 'Droits insuffisants');
  next();
};

export const canWrite = requireRole('admin', 'manager');
