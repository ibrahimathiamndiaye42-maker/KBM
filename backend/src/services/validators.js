import { z } from 'zod';

// Téléphone normalisé : chiffres uniquement. Un numéro sénégalais à 9 chiffres (7XXXXXXXX) reçoit l'indicatif 221.
export function normalizePhone(raw) {
  let d = String(raw).replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 9 && d.startsWith('7')) d = `221${d}`;
  return d;
}

export const phone = z.string().trim().transform(normalizePhone)
  .refine((d) => d.length >= 8 && d.length <= 15, 'Numéro de téléphone invalide.');

export const name = z.string().trim().min(2, 'Nom trop court.').max(100);
export const optionalEmail = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v), z.string().trim().email('E-mail invalide.').max(150).optional());
export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (AAAA-MM-JJ).')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Date invalide.');
export const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide (HH:MM).');
export const amount = z.coerce.number().int('Montant entier requis.').min(0).max(10_000_000);
export const httpsUrlOrEmpty = z.string().trim().max(500)
  .refine((v) => v === '' || /^https:\/\//i.test(v), 'Le lien doit commencer par https://');

export const PAYMENT_METHODS = ['ESPECES', 'WAVE', 'ORANGE_MONEY', 'AUTRE'];
export const RESERVATION_STATUSES = ['EN_ATTENTE', 'CONFIRMEE', 'ANNULEE', 'TERMINEE'];
export const PAYMENT_STATUSES = ['EN_ATTENTE', 'CONFIRME', 'REFUSE'];

// Date du jour à Dakar (UTC+0 toute l'année)
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const nowHHMM = () => new Date().toISOString().slice(11, 16);

// Image envoyée en base64 (déjà redimensionnée côté navigateur)
export const imageUpload = z.object({
  mime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  data: z.string().max(1_800_000, 'Image trop lourde.'),
});
