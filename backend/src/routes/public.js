import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { AppError } from '../middleware/errors.js';
import { SETTING_DEFS, getSettings } from '../services/settings.js';
import { notifyNewReservation } from '../services/notify.js';
import { buildSlots, resolveItem, upsertClient } from '../services/bookings.js';
import { loadReceipt, renderReceipt } from '../services/receiptPdf.js';
import { MEDIA_KEY, mediaUrls, withImages } from '../services/media.js';
import { dateStr, name, optionalEmail, phone, timeStr, todayStr } from '../services/validators.js';

const router = Router();

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de réservations depuis cet appareil. Réessayez plus tard.' },
});

router.get('/config', async (_req, res) => {
  const settings = await getSettings();
  const pub = Object.fromEntries(Object.entries(settings).filter(([k]) => SETTING_DEFS[k]?.public));
  const [services, packs, gallery, logo, urls] = await Promise.all([
    query('SELECT id, nom, description, prix FROM services WHERE actif ORDER BY ordre, id'),
    query('SELECT id, nom, description, prix FROM packs WHERE actif ORDER BY ordre, id'),
    query('SELECT id, legende FROM gallery ORDER BY ordre, id'),
    query(`SELECT extract(epoch FROM updated_at)::bigint AS v FROM assets WHERE key = 'logo'`),
    mediaUrls(),
  ]);
  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    settings: pub,
    services: withImages(services.rows, 'service', urls),
    packs: withImages(packs.rows, 'pack', urls),
    gallery: gallery.rows,
    about_image: urls.about ?? null,
    logo_version: logo.rows[0]?.v ?? null,
  });
});

router.get('/logo', async (_req, res) => {
  const { rows } = await query(`SELECT mime, data FROM assets WHERE key = 'logo'`);
  if (!rows[0]) return res.status(404).end();
  res.set({ 'Content-Type': rows[0].mime, 'Cache-Control': 'public, max-age=86400' }).send(rows[0].data);
});

router.get('/media/:key', async (req, res) => {
  if (!MEDIA_KEY.test(req.params.key)) return res.status(404).end();
  const { rows } = await query('SELECT mime, data FROM assets WHERE key = $1', [req.params.key]);
  if (!rows[0]) return res.status(404).end();
  res.set({ 'Content-Type': rows[0].mime, 'Cache-Control': 'public, max-age=31536000, immutable' }).send(rows[0].data);
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

// Lien du reçu envoyé à la cliente : le jeton aléatoire (192 bits) tient lieu de mot de passe
const receiptLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans quelques minutes.' } });
router.get('/receipts/:token/pdf', receiptLimiter, async (req, res) => {
  const token = z.string().regex(/^[a-f0-9]{48,64}$/).safeParse(req.params.token);
  if (!token.success) return res.status(404).json({ error: 'Reçu introuvable.' });
  const hit = (await query('SELECT id FROM receipts WHERE share_token = $1', [token.data])).rows[0];
  if (!hit) return res.status(404).json({ error: 'Reçu introuvable.' });
  const receipt = await loadReceipt(hit.id);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${receipt.numero}.pdf"`,
    'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' });
  await renderReceipt(receipt, res);
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

  // Envoi en arrière-plan : la cliente n'attend pas WhatsApp, et un échec n'annule rien
  notifyNewReservation(created.id);

  res.status(201).json({
    reservation: created,
    message: "Votre demande est bien reçue. Elle sera confirmée après l'appel de l'institut et la vérification de votre paiement.",
  });
});

export default router;
