import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { AppError } from '../middleware/errors.js';
import { COOKIE_NAME, cookieOptions, requireAuth, signSession } from '../middleware/auth.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

// Hash factice pour garder un temps de réponse constant quand l'e-mail n'existe pas
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1).max(200),
  }).parse(req.body);

  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !user.actif || !ok) throw new AppError(401, 'E-mail ou mot de passe incorrect.');

  res.cookie(COOKIE_NAME, signSession(user), cookieOptions);
  res.json({ user: { id: user.id, nom: user.nom, email: user.email, role: user.role } });
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

// Modifier ses propres coordonnées (changer d'e-mail exige le mot de passe actuel)
router.patch('/me', requireAuth, async (req, res) => {
  const b = z.object({
    nom: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email().max(150),
    telephone: z.string().trim().max(30).optional().default(''),
    password: z.string().max(200).optional(),
  }).parse(req.body);
  const cur = (await query('SELECT email, password_hash FROM users WHERE id = $1', [req.user.id])).rows[0];
  if (b.email !== cur.email && !(b.password && (await bcrypt.compare(b.password, cur.password_hash))))
    throw new AppError(400, "Mot de passe actuel requis pour changer l'adresse e-mail.");
  try {
    const { rows } = await query(
      'UPDATE users SET nom = $1, email = $2, telephone = $3 WHERE id = $4 RETURNING id, nom, email, telephone, role',
      [b.nom, b.email, b.telephone || null, req.user.id]);
    res.json({ user: rows[0] });
  } catch (e) {
    if (e.code === '23505') throw new AppError(409, 'Cette adresse e-mail est déjà utilisée.');
    throw e;
  }
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { current, next } = z.object({
    current: z.string().min(1),
    next: z.string().min(10, 'Minimum 10 caractères.').max(200),
  }).parse(req.body);
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!(await bcrypt.compare(current, rows[0].password_hash)))
    throw new AppError(400, 'Mot de passe actuel incorrect.');
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(next, 12), req.user.id]);
  res.json({ ok: true });
});

export default router;
