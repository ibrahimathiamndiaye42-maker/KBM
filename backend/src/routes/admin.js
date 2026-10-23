import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { AppError } from '../middleware/errors.js';
import { requireAuth, requireOwner } from '../middleware/auth.js';
import { SETTING_DEFS } from '../services/settings.js';
import { resolveItem, upsertClient } from '../services/bookings.js';
import { MEDIA_KEY, mediaUrls, withImages } from '../services/media.js';
import { loadReceipt, renderReceipt } from '../services/receiptPdf.js';
import {
  PAYMENT_METHODS, PAYMENT_STATUSES, RESERVATION_STATUSES, amount, dateStr, imageUpload,
  name, nowHHMM, optionalEmail, phone, timeStr, todayStr,
} from '../services/validators.js';

const router = Router();
router.use(requireAuth);

const id = (v) => z.coerce.number().int().positive().parse(v);

const RESERVATION_SELECT = `
  SELECT r.id, r.client_id, c.nom AS client_nom, c.telephone AS client_telephone,
         r.service_id, r.pack_id, r.item_label, r.date, to_char(r.heure,'HH24:MI') AS heure,
         r.montant, r.statut, r.source, r.notes, r.created_at,
         p.id AS payment_id, p.statut AS paiement_statut, p.moyen AS paiement_moyen,
         p.montant AS paiement_montant, p.confirmed_at,
         rc.id AS receipt_id, rc.numero AS receipt_numero
    FROM reservations r
    JOIN clients c ON c.id = r.client_id
    LEFT JOIN payments p ON p.reservation_id = r.id
    LEFT JOIN receipts rc ON rc.reservation_id = r.id`;

/* ---------- Tableau de bord ---------- */
router.get('/dashboard', async (_req, res) => {
  const today = todayStr();
  const [stats, todayList, upcoming] = await Promise.all([
    query(`SELECT
      count(*) FILTER (WHERE date = $1 AND statut <> 'ANNULEE')::int AS aujourdhui,
      count(*) FILTER (WHERE date > $1 AND statut IN ('EN_ATTENTE','CONFIRMEE'))::int AS a_venir,
      count(*) FILTER (WHERE statut = 'EN_ATTENTE')::int AS en_attente,
      count(*) FILTER (WHERE statut = 'CONFIRMEE')::int AS confirmees,
      count(*) FILTER (WHERE statut = 'TERMINEE')::int AS prestations
      FROM reservations`, [today]),
    query(`${RESERVATION_SELECT} WHERE r.date = $1 AND r.statut <> 'ANNULEE' ORDER BY r.heure`, [today]),
    query(`${RESERVATION_SELECT} WHERE r.date > $1 AND r.statut IN ('EN_ATTENTE','CONFIRMEE')
           ORDER BY r.date, r.heure LIMIT 8`, [today]),
  ]);
  const extra = await query(`SELECT
      (SELECT count(*)::int FROM clients) AS clients,
      (SELECT count(*)::int FROM payments WHERE statut = 'CONFIRME') AS paiements,
      (SELECT COALESCE(sum(montant),0)::int FROM payments WHERE statut = 'CONFIRME') AS total_encaisse`);
  res.json({ ...stats.rows[0], ...extra.rows[0], aujourdhui_liste: todayList.rows, a_venir_liste: upcoming.rows });
});

/* ---------- Réservations ---------- */
router.get('/reservations', async (req, res) => {
  const q = z.object({
    q: z.string().trim().max(100).optional(),
    statut: z.enum(RESERVATION_STATUSES).optional(),
    paiement: z.enum(PAYMENT_STATUSES).optional(),
    periode: z.enum(['today', 'upcoming', 'past', 'all']).default('all'),
    page: z.coerce.number().int().min(1).default(1),
  }).parse(req.query);

  const where = []; const params = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
  if (q.q) {
    params.push(`%${q.q}%`);
    where.push(`(c.nom ILIKE $${params.length} OR c.telephone LIKE $${params.length} OR r.item_label ILIKE $${params.length})`);
  }
  if (q.statut) add('r.statut = ?', q.statut);
  if (q.paiement) add('p.statut = ?', q.paiement);
  if (q.periode === 'today') add('r.date = ?', todayStr());
  if (q.periode === 'upcoming') add('r.date >= ?', todayStr());
  if (q.periode === 'past') add('r.date < ?', todayStr());

  const sql = `${RESERVATION_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${q.periode === 'past' || q.periode === 'all' ? 'r.date DESC, r.heure DESC' : 'r.date, r.heure'}
    LIMIT 50 OFFSET ${(q.page - 1) * 50}`;
  res.json({ reservations: (await query(sql, params)).rows, page: q.page });
});

router.get('/reservations/:id', async (req, res) => {
  const { rows } = await query(`${RESERVATION_SELECT} WHERE r.id = $1`, [id(req.params.id)]);
  if (!rows[0]) throw new AppError(404, 'Réservation introuvable.');
  res.json({ reservation: rows[0] });
});

// « + Nouvelle cliente » : cliente venue directement à l'institut
router.post('/walk-ins', async (req, res) => {
  const b = z.object({
    nom: name, telephone: phone, email: optionalEmail,
    service_id: z.coerce.number().int().positive().optional(),
    pack_id: z.coerce.number().int().positive().optional(),
    date: dateStr.default(todayStr()),
    montant: amount.optional(),
    moyen: z.enum(PAYMENT_METHODS).optional(),
    paye: z.boolean().default(true),
    notes: z.string().trim().max(500).optional(),
  }).parse(req.body);
  if (b.paye && !b.moyen) throw new AppError(400, 'Indiquez le moyen de paiement.');

  const out = await withTransaction(async (db) => {
    const item = await resolveItem(db, b);
    const client = await upsertClient(db, b);
    const montant = b.montant ?? item.prix;
    const { rows } = await db.query(
      `INSERT INTO reservations(client_id, service_id, pack_id, item_label, date, heure, montant, statut, source, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'TERMINEE','SUR_PLACE',$8,$9) RETURNING id`,
      [client.id, item.service_id, item.pack_id, item.nom, b.date, nowHHMM(), montant, b.notes ?? null, req.user.id]);
    await db.query(
      `INSERT INTO payments(reservation_id, montant, moyen, statut, confirmed_by, confirmed_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [rows[0].id, montant, b.moyen ?? null, b.paye ? 'CONFIRME' : 'EN_ATTENTE',
        b.paye ? req.user.id : null, b.paye ? new Date() : null]);
    return rows[0].id;
  });
  const { rows } = await query(`${RESERVATION_SELECT} WHERE r.id = $1`, [out]);
  res.status(201).json({ reservation: rows[0] });
});

router.patch('/reservations/:id', async (req, res) => {
  const rid = id(req.params.id);
  const b = z.object({
    statut: z.enum(RESERVATION_STATUSES).optional(),
    date: dateStr.optional(),
    heure: timeStr.optional(),
    service_id: z.coerce.number().int().positive().optional(),
    pack_id: z.coerce.number().int().positive().optional(),
    montant: amount.optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  }).parse(req.body);

  await withTransaction(async (db) => {
    const cur = (await db.query(
      `SELECT r.*, p.statut AS paiement_statut, rc.id AS receipt_id
         FROM reservations r LEFT JOIN payments p ON p.reservation_id = r.id
         LEFT JOIN receipts rc ON rc.reservation_id = r.id WHERE r.id = $1 FOR UPDATE OF r`, [rid])).rows[0];
    if (!cur) throw new AppError(404, 'Réservation introuvable.');

    const changesItem = b.service_id || b.pack_id;
    if (cur.receipt_id && (changesItem || (b.montant !== undefined && b.montant !== cur.montant)))
      throw new AppError(409, 'Un reçu existe déjà : la prestation et le montant ne sont plus modifiables.');
    if (b.statut === 'ANNULEE' && cur.paiement_statut === 'CONFIRME')
      throw new AppError(409, 'Le paiement est déjà confirmé : impossible d\'annuler cette réservation.');

    const sets = []; const params = [];
    const set = (col, v) => { params.push(v); sets.push(`${col} = $${params.length}`); };
    if (b.statut) set('statut', b.statut);
    if (b.date) set('date', b.date);
    if (b.heure) set('heure', b.heure);
    if (b.notes !== undefined) set('notes', b.notes);
    let montant = b.montant;
    if (changesItem) {
      const item = await resolveItem(db, b);
      set('service_id', item.service_id); set('pack_id', item.pack_id); set('item_label', item.nom);
      montant ??= item.prix;
    }
    if (montant !== undefined) {
      set('montant', montant);
      if (cur.paiement_statut !== 'CONFIRME')
        await db.query('UPDATE payments SET montant = $1 WHERE reservation_id = $2', [montant, rid]);
    }
    if (sets.length) {
      params.push(rid);
      await db.query(`UPDATE reservations SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    }
    if (b.statut === 'ANNULEE')
      await db.query(`UPDATE payments SET statut = 'REFUSE' WHERE reservation_id = $1 AND statut = 'EN_ATTENTE'`, [rid]);
  });
  const { rows } = await query(`${RESERVATION_SELECT} WHERE r.id = $1`, [rid]);
  res.json({ reservation: rows[0] });
});

// Enregistrer / confirmer le paiement (action manuelle)
router.put('/reservations/:id/payment', async (req, res) => {
  const rid = id(req.params.id);
  const b = z.object({
    statut: z.enum(PAYMENT_STATUSES),
    moyen: z.enum(PAYMENT_METHODS).optional(),
    montant: amount.optional(),
  }).parse(req.body);
  if (b.statut === 'CONFIRME' && !b.moyen) throw new AppError(400, 'Indiquez le moyen de paiement.');

  await withTransaction(async (db) => {
    const cur = (await db.query(
      `SELECT r.statut AS res_statut, r.montant AS res_montant, p.statut, rc.id AS receipt_id
         FROM reservations r JOIN payments p ON p.reservation_id = r.id
         LEFT JOIN receipts rc ON rc.reservation_id = r.id WHERE r.id = $1 FOR UPDATE OF p`, [rid])).rows[0];
    if (!cur) throw new AppError(404, 'Réservation introuvable.');
    if (cur.receipt_id) throw new AppError(409, 'Un reçu a déjà été émis pour ce paiement.');
    if (cur.res_statut === 'ANNULEE' && b.statut === 'CONFIRME')
      throw new AppError(409, 'Cette réservation est annulée.');
    const confirmed = b.statut === 'CONFIRME';
    await db.query(
      `UPDATE payments SET statut = $1, moyen = COALESCE($2, moyen), montant = $3,
              confirmed_by = $4, confirmed_at = $5 WHERE reservation_id = $6`,
      [b.statut, b.moyen ?? null, b.montant ?? cur.res_montant,
        confirmed ? req.user.id : null, confirmed ? new Date() : null, rid]);
    // Paiement confirmé sur une réservation encore en attente : elle devient confirmée
    if (confirmed && cur.res_statut === 'EN_ATTENTE')
      await db.query(`UPDATE reservations SET statut = 'CONFIRMEE' WHERE id = $1`, [rid]);
  });
  const { rows } = await query(`${RESERVATION_SELECT} WHERE r.id = $1`, [rid]);
  res.json({ reservation: rows[0] });
});

/* ---------- Reçus ---------- */
router.post('/reservations/:id/receipt', async (req, res) => {
  const rid = id(req.params.id);
  const receipt = await withTransaction(async (db) => {
    const existing = (await db.query('SELECT * FROM receipts WHERE reservation_id = $1', [rid])).rows[0];
    if (existing) return existing;
    const p = (await db.query(
      `SELECT p.*, r.client_id FROM payments p JOIN reservations r ON r.id = p.reservation_id
        WHERE p.reservation_id = $1 FOR UPDATE OF p`, [rid])).rows[0];
    if (!p) throw new AppError(404, 'Réservation introuvable.');
    if (p.statut !== 'CONFIRME') throw new AppError(409, 'Le paiement doit être confirmé avant de générer un reçu.');

    const year = new Date().getUTCFullYear();
    // Incrément atomique : deux reçus simultanés ne peuvent jamais obtenir le même numéro
    const { rows } = await db.query(
      `INSERT INTO receipt_counters(year, last_seq) VALUES ($1, 1)
       ON CONFLICT (year) DO UPDATE SET last_seq = receipt_counters.last_seq + 1 RETURNING last_seq`, [year]);
    const numero = `KMB-${year}-${String(rows[0].last_seq).padStart(6, '0')}`;
    return (await db.query(
      `INSERT INTO receipts(numero, client_id, reservation_id, payment_id, montant, moyen, paid_at, generated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [numero, p.client_id, rid, p.id, p.montant, p.moyen, p.confirmed_at ?? new Date(), req.user.id])).rows[0];
  });
  res.status(201).json({ receipt });
});

router.get('/receipts/:id/pdf', async (req, res) => {
  const receipt = await loadReceipt(id(req.params.id));
  if (!receipt) throw new AppError(404, 'Reçu introuvable.');
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${receipt.numero}.pdf"`,
    'Cache-Control': 'private, no-store',
  });
  await renderReceipt(receipt, res);
});

/* ---------- Clientes ---------- */
router.get('/clients', async (req, res) => {
  const { q } = z.object({ q: z.string().trim().max(100).optional() }).parse(req.query);
  const params = q ? [`%${q}%`] : [];
  const { rows } = await query(
    `SELECT c.id, c.nom, c.telephone, c.email, c.created_at,
            count(r.id)::int AS nb_visites, max(r.date) AS derniere_visite
       FROM clients c LEFT JOIN reservations r ON r.client_id = c.id AND r.statut <> 'ANNULEE'
       ${q ? 'WHERE c.nom ILIKE $1 OR c.telephone LIKE $1' : ''}
       GROUP BY c.id ORDER BY c.created_at DESC LIMIT 100`, params);
  res.json({ clients: rows });
});

router.get('/clients/:id', async (req, res) => {
  const cid = id(req.params.id);
  const client = (await query('SELECT * FROM clients WHERE id = $1', [cid])).rows[0];
  if (!client) throw new AppError(404, 'Cliente introuvable.');
  const { rows } = await query(`${RESERVATION_SELECT} WHERE r.client_id = $1 ORDER BY r.date DESC, r.heure DESC`, [cid]);
  res.json({
    client,
    reservations: rows,
    receipts: rows.filter((r) => r.receipt_id).map((r) => ({ id: r.receipt_id, numero: r.receipt_numero, item_label: r.item_label, montant: r.paiement_montant, date: r.date })),
  });
});

router.patch('/clients/:id', async (req, res) => {
  const b = z.object({ nom: name.optional(), telephone: phone.optional(), email: optionalEmail }).parse(req.body);
  const { rows } = await query(
    `UPDATE clients SET nom = COALESCE($1, nom), telephone = COALESCE($2, telephone), email = COALESCE($3, email)
      WHERE id = $4 RETURNING *`, [b.nom ?? null, b.telephone ?? null, b.email ?? null, id(req.params.id)]);
  if (!rows[0]) throw new AppError(404, 'Cliente introuvable.');
  res.json({ client: rows[0] });
});

/* ---------- Propriétaire uniquement : catalogue ---------- */
const catalogSchema = z.object({
  nom: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).default(''),
  prix: amount,
  ordre: z.coerce.number().int().default(0),
  actif: z.boolean().default(true),
});

for (const [path, table] of [['services', 'services'], ['packs', 'packs']]) {
  router.get(`/${path}`, async (_req, res) => {
    const rows = (await query(`SELECT * FROM ${table} ORDER BY ordre, id`)).rows;
    res.json({ items: withImages(rows, table === 'services' ? 'service' : 'pack', await mediaUrls()) });
  });
  router.post(`/${path}`, requireOwner, async (req, res) => {
    const b = catalogSchema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO ${table}(nom, description, prix, ordre, actif) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [b.nom, b.description, b.prix, b.ordre, b.actif]);
    res.status(201).json({ item: rows[0] });
  });
  router.put(`/${path}/:id`, requireOwner, async (req, res) => {
    const b = catalogSchema.parse(req.body);
    const { rows } = await query(
      `UPDATE ${table} SET nom=$1, description=$2, prix=$3, ordre=$4, actif=$5 WHERE id=$6 RETURNING *`,
      [b.nom, b.description, b.prix, b.ordre, b.actif, id(req.params.id)]);
    if (!rows[0]) throw new AppError(404, 'Introuvable.');
    res.json({ item: rows[0] });
  });
  // Pas de suppression : on désactive (l'historique des réservations reste intact)
}

/* ---------- Propriétaire uniquement : réglages, logo, galerie ---------- */
router.get('/settings', requireOwner, async (_req, res) => {
  const { getSettings } = await import('../services/settings.js');
  res.json({ settings: await getSettings() });
});

router.put('/settings', requireOwner, async (req, res) => {
  const shape = {};
  for (const key of Object.keys(SETTING_DEFS)) {
    if (key.startsWith('color_')) shape[key] = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide.').optional();
    else if (['instagram', 'facebook', 'tiktok', 'maps_link'].includes(key))
      shape[key] = z.string().trim().max(500).refine((v) => v === '' || /^https:\/\//i.test(v), 'Le lien doit commencer par https://').optional();
    else if (key === 'maps_embed_url')
      shape[key] = z.string().trim().max(1500).refine((v) => v === '' || /^https:\/\/www\.google\.com\/maps\/embed/i.test(v),
        'Utilisez le lien « src » de la carte à intégrer (https://www.google.com/maps/embed...).').optional();
    else if (key === 'whatsapp') shape[key] = z.string().trim().transform((v) => v.replace(/\D/g, '')).optional();
    else if (key === 'open_time' || key === 'close_time') shape[key] = timeStr.optional();
    else if (key === 'slot_minutes') shape[key] = z.coerce.number().int().min(15).max(480).transform(String).optional();
    else if (key === 'max_per_slot') shape[key] = z.coerce.number().int().min(1).max(50).transform(String).optional();
    else shape[key] = z.string().trim().max(key === 'about_text' ? 3000 : 300).optional();
  }
  const b = z.object(shape).strict().parse(req.body);
  for (const [k, v] of Object.entries(b))
    if (v !== undefined)
      await query('INSERT INTO settings(key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [k, v]);
  res.json({ ok: true });
});

router.put('/logo', requireOwner, async (req, res) => {
  const b = imageUpload.parse(req.body);
  await query(
    `INSERT INTO assets(key, mime, data, updated_at) VALUES ('logo',$1,$2,now())
     ON CONFLICT (key) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data, updated_at = now()`,
    [b.mime, Buffer.from(b.data, 'base64')]);
  res.json({ ok: true });
});
router.delete('/logo', requireOwner, async (_req, res) => {
  await query(`DELETE FROM assets WHERE key = 'logo'`);
  res.json({ ok: true });
});

// Images des services, packs et de la section « À propos »
router.put('/media/:key', requireOwner, async (req, res) => {
  if (!MEDIA_KEY.test(req.params.key)) throw new AppError(400, 'Clé image invalide.');
  const b = imageUpload.parse(req.body);
  await query(
    `INSERT INTO assets(key, mime, data, updated_at) VALUES ($1,$2,$3,now())
     ON CONFLICT (key) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data, updated_at = now()`,
    [req.params.key, b.mime, Buffer.from(b.data, 'base64')]);
  res.json({ ok: true });
});
router.delete('/media/:key', requireOwner, async (req, res) => {
  if (!MEDIA_KEY.test(req.params.key)) throw new AppError(400, 'Clé image invalide.');
  await query('DELETE FROM assets WHERE key = $1', [req.params.key]);
  res.json({ ok: true });
});

router.get('/gallery', requireOwner, async (_req, res) => {
  res.json({ items: (await query('SELECT id, legende, ordre FROM gallery ORDER BY ordre, id')).rows });
});
router.post('/gallery', requireOwner, async (req, res) => {
  const b = imageUpload.extend({ legende: z.string().trim().max(150).default('') }).parse(req.body);
  const { rows } = await query(
    `INSERT INTO gallery(mime, data, legende, ordre)
     VALUES ($1,$2,$3,(SELECT COALESCE(max(ordre),0)+1 FROM gallery)) RETURNING id, legende`,
    [b.mime, Buffer.from(b.data, 'base64'), b.legende]);
  res.status(201).json({ item: rows[0] });
});
router.delete('/gallery/:id', requireOwner, async (req, res) => {
  await query('DELETE FROM gallery WHERE id = $1', [id(req.params.id)]);
  res.json({ ok: true });
});

/* ---------- Propriétaire uniquement : comptes ---------- */
router.get('/users', requireOwner, async (_req, res) => {
  res.json({ users: (await query('SELECT id, nom, email, telephone, role, actif, created_at FROM users ORDER BY id')).rows });
});

router.post('/users', requireOwner, async (req, res) => {
  const b = z.object({
    nom: name, email: z.string().trim().toLowerCase().email(), telephone: z.string().trim().max(30).optional(),
    password: z.string().min(10, 'Minimum 10 caractères.').max(200),
    role: z.enum(['owner', 'staff']).default('staff'),
  }).parse(req.body);
  const { rows } = await query(
    `INSERT INTO users(nom, email, telephone, password_hash, role) VALUES ($1,$2,$3,$4,$5)
     RETURNING id, nom, email, telephone, role, actif`,
    [b.nom, b.email, b.telephone ?? null, await bcrypt.hash(b.password, 12), b.role]);
  res.status(201).json({ user: rows[0] });
});

router.patch('/users/:id', requireOwner, async (req, res) => {
  const uid = id(req.params.id);
  const b = z.object({
    actif: z.boolean().optional(), role: z.enum(['owner', 'staff']).optional(),
    password: z.string().min(10).max(200).optional(),
  }).parse(req.body);
  if (uid === req.user.id && (b.actif === false || b.role === 'staff'))
    throw new AppError(400, 'Vous ne pouvez pas retirer vos propres droits.');
  const hash = b.password ? await bcrypt.hash(b.password, 12) : null;
  const { rows } = await query(
    `UPDATE users SET actif = COALESCE($1, actif), role = COALESCE($2, role), password_hash = COALESCE($3, password_hash)
      WHERE id = $4 RETURNING id, nom, email, role, actif`, [b.actif ?? null, b.role ?? null, hash, uid]);
  if (!rows[0]) throw new AppError(404, 'Utilisateur introuvable.');
  res.json({ user: rows[0] });
});

export default router;
