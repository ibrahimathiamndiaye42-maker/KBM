import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';
import { AppError } from './errors.js';

export const COOKIE_NAME = 'kmb_session';

export const cookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'lax',
  path: '/',
  maxAge: 12 * 60 * 60 * 1000,
};

export function signSession(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

// Vérifie le cookie ET relit l'utilisateur en base (un compte désactivé perd l'accès immédiatement)
export async function requireAuth(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new AppError(401, 'Connexion requise.');
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError(401, 'Session expirée. Reconnectez-vous.');
  }
  const { rows } = await query(
    'SELECT id, nom, email, role, actif FROM users WHERE id = $1', [payload.sub]);
  const user = rows[0];
  if (!user || !user.actif) throw new AppError(401, 'Compte inactif ou introuvable.');
  req.user = user;
  next();
}

export const requireOwner = (req, _res, next) => {
  if (req.user?.role !== 'owner') throw new AppError(403, 'Action réservée à la propriétaire.');
  next();
};

// Défense CSRF : les requêtes qui modifient des données doivent porter un en-tête personnalisé
// (impossible à envoyer depuis un autre site sans autorisation CORS) en plus du cookie SameSite.
export function requireCustomHeader(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'kmb') throw new AppError(403, 'Requête refusée.');
  next();
}
