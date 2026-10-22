import { AppError } from '../middleware/errors.js';
import { fromMinutes, getSettings, toMinutes } from './settings.js';
import { nowHHMM, todayStr } from './validators.js';

// Récupère un service ou un pack actif et renvoie son libellé et son prix (jamais fournis par le client)
export async function resolveItem(db, { service_id, pack_id }) {
  if ((service_id ? 1 : 0) + (pack_id ? 1 : 0) !== 1)
    throw new AppError(400, 'Choisissez un service ou un pack.');
  const table = service_id ? 'services' : 'packs';
  const { rows } = await db.query(`SELECT id, nom, prix, actif FROM ${table} WHERE id = $1`, [service_id ?? pack_id]);
  if (!rows[0]) throw new AppError(404, 'Service ou pack introuvable.');
  return { ...rows[0], service_id: service_id ?? null, pack_id: pack_id ?? null };
}

export async function buildSlots(db, date) {
  const s = await getSettings();
  const step = Math.max(15, Number(s.slot_minutes) || 60);
  const max = Math.max(1, Number(s.max_per_slot) || 1);
  const start = toMinutes(s.open_time);
  const end = toMinutes(s.close_time);
  const { rows } = await db.query(
    `SELECT to_char(heure, 'HH24:MI') AS heure, count(*)::int AS n
       FROM reservations WHERE date = $1 AND statut IN ('EN_ATTENTE','CONFIRMEE') GROUP BY heure`, [date]);
  const taken = Object.fromEntries(rows.map((r) => [r.heure, r.n]));
  const slots = [];
  for (let m = start; m + step <= end; m += step) {
    const h = fromMinutes(m);
    const past = date < todayStr() || (date === todayStr() && h <= nowHHMM());
    slots.push({ heure: h, disponible: !past && (taken[h] ?? 0) < max });
  }
  return slots;
}

// Insère ou retrouve une cliente par son numéro de téléphone
export async function upsertClient(db, { nom, telephone, email }) {
  const { rows } = await db.query(
    `INSERT INTO clients(nom, telephone, email) VALUES ($1,$2,$3)
     ON CONFLICT (telephone) DO UPDATE SET email = COALESCE(clients.email, EXCLUDED.email)
     RETURNING *`, [nom, telephone, email ?? null]);
  return rows[0];
}
