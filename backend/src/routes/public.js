import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { AppError } from '../middleware/errors.js';
import { SETTING_DEFS, getSettings } from '../services/settings.js';
import { buildSlots, resolveItem, upsertClient } from '../services/bookings.js';
import { dateStr, name, optionalEmail, phone, timeStr, todayStr } from '../services/validators.js';

const router = Router();

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de réservations depuis cet appareil. Réessayez plus tard.' },
});

router.get('/config', async (_req, res) => {
  const settings = await getSettings();
  const pub = Object.fromEntries(Object.entries(settings).filter(([k]) => SETTING_DEFS[k]?.public));
  const [services, packs, gallery, logo] = await Promise.all([
    query('SELECT id, nom, description, prix FROM services WHERE actif ORDER BY ordre, id'),
    query('SELECT id, nom, description, prix FROM packs WHERE actif ORDER BY ordre, id'),
    query('SELECT id, legende FROM gallery ORDER BY ordre, id'),
    query(`SELECT extract(epoch FROM updated_at)::bigint AS v FROM assets WHERE key = 'logo'`),
  ]);
  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    settings: pub, services: services.rows, packs: packs.rows, gallery: gallery.rows,
    logo_version: logo.rows[0]?.v ?? null,
  });
});

router.get('/logo', async (_req, res) => {
  const { rows } = await query(`SELECT mime, data FROM assets WHERE key = 'logo'`);
  if (!rows[0]) return res.status(404).end();
  res.set({ 'Content-Type': rows[0].mime, 'Cache-Control': 'public, max-age=86400' }).send(rows[0].data);
});

router.get('/gallery/:id/image', async (req, res) => {
  const id = z.coerce.number().int().parse(req.params.id);
  const { rows } = await query('SELECT mime, data FROM gallery WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).end();
  res.set({ 'Content-Type': rows[0].mime, 'Cache-Control': 'public, max-age=604800, immutable' }).send(rows[0].data);
});

router.get('/slots', async (req, res) => {
  const { date } = z.object({ date: dateStr }).parse(req.query);
  res.json({ date, slots: await buildSlots({ query }, date) });
});

const bookingSchema = z.object({
  service_id: z.coerce.number().int().positive().optional(),
  pack_id: z.coerce.number().int().positive().optional(),
  date: dateStr,
  heure: timeStr,
  nom: name,
  telephone: phone,
  email: optionalEmail,
});

router.post('/reservations', bookingLimiter, async (req, res) => {
  const body = bookingSchema.parse(req.body);
  if (body.date < todayStr()) throw new AppError(400, 'Cette date est passée.');

  const created = await withTransaction(async (db) => {
    // Verrou par créneau : évite deux réservations simultanées au-delà de la capacité
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${body.date} ${body.heure}`]);
    const slots = await buildSlots(db, body.date);
    const slot = slots.find((s) => s.heure === body.heure);
    if (!slot) throw new AppError(400, "Ce créneau n'existe pas.");
    if (!slot.disponible) throw new AppError(409, "Ce créneau n'est plus disponible. Choisissez une autre heure.");

    const item = await resolveItem(db, body);
    if (!item.actif) throw new AppError(400, "Ce service n'est plus proposé.");
    const client = await upsertClient(db, body);
    const { rows } = await db.query(
      `INSERT INTO reservations(client_id, service_id, pack_id, item_label, date, heure, montant, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'EN_LIGNE') RETURNING id, date, to_char(heure,'HH24:MI') AS heure, statut`,
      [client.id, item.service_id, item.pack_id, item.nom, body.date, body.heure, item.prix]);
    await db.query('INSERT INTO payments(reservation_id, montant) VALUES ($1,$2)', [rows[0].id, item.prix]);
    return { ...rows[0], item_label: item.nom, montant: item.prix };
  });

  res.status(201).json({
    reservation: created,
    message: 'Votre réservation est enregistrée et en attente de validation par l\'institut.',
  });
});

export default router;
