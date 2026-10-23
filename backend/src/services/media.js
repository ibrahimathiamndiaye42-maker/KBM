import { query } from '../db/pool.js';

// Clés autorisées : image d'un service, d'un pack, ou de l'établissement (section « À propos »)
export const MEDIA_KEY = /^(service-\d+|pack-\d+|about)$/;

// Renvoie une table clé → URL versionnée (le ?v= change à chaque nouvel envoi : cache long sans risque)
export async function mediaUrls() {
  const { rows } = await query(
    `SELECT key, extract(epoch FROM updated_at)::bigint AS v FROM assets WHERE key ~ '^(service-|pack-|about)'`);
  return Object.fromEntries(rows.map((r) => [r.key, `/api/public/media/${r.key}?v=${r.v}`]));
}

export const withImages = (items, prefix, urls) =>
  items.map((i) => ({ ...i, image: urls[`${prefix}-${i.id}`] ?? null }));
