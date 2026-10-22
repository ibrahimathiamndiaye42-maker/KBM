import { ZodError } from 'zod';
import { env } from '../config/env.js';

export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (_req, res) => res.status(404).json({ error: 'Ressource introuvable.' });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Données invalides.',
      details: err.issues.map((i) => ({ champ: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Fichier trop volumineux.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Requête mal formée.' });
  if (err.code === '23505') return res.status(409).json({ error: 'Cette valeur existe déjà.' });
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur.', ...(env.isProd ? {} : { debug: err.message }) });
}
