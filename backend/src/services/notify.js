import { env } from '../config/env.js';
import { query } from '../db/pool.js';
import { getSettings } from './settings.js';

const wa = env.whatsapp;
export const whatsappConfigured = () => Boolean(wa.token && wa.phoneNumberId);
export const whatsappMode = () => (wa.templateName ? 'template' : 'text');

const money = (n) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F CFA`;
const fdate = (s) => s.split('-').reverse().join('/');
// Les variables de modèle WhatsApp n'acceptent ni retour à la ligne ni longues suites d'espaces
const flat = (v) => String(v ?? '').replace(/\s+/g, ' ').trim() || '—';

async function loadReservation(id) {
  const { rows } = await query(
    `SELECT r.id, r.item_label, r.date, to_char(r.heure,'HH24:MI') AS heure, r.montant,
            c.nom, c.telephone, c.email
       FROM reservations r JOIN clients c ON c.id = r.client_id WHERE r.id = $1`, [id]);
  return rows[0];
}

// Texte libre (mode « text ») : lisible, avec retours à la ligne
export function buildText(r) {
  return [
    `Nouvelle demande de réservation n°${r.id}`,
    `Cliente : ${r.nom}`,
    `Téléphone : +${r.telephone}`,
    `E-mail : ${r.email || 'non renseigné'}`,
    `Prestation : ${r.item_label}`,
    `Date : ${fdate(r.date)} à ${r.heure}`,
    `Montant : ${money(r.montant)}`,
    '',
    'À faire : appeler la cliente pour confirmer les informations et lui indiquer comment payer.',
  ].join('\n');
}

// Variables du modèle approuvé par Meta (voir README) : {{1}} … {{7}}
export function buildTemplateParams(r) {
  return [r.id, r.nom, `+${r.telephone}`, r.email || 'non renseigné', r.item_label,
    `${fdate(r.date)} à ${r.heure}`, money(r.montant)].map(flat);
}

async function sendWhatsApp(to, r) {
  const url = `${wa.apiBase}/${wa.apiVersion}/${wa.phoneNumberId}/messages`;
  const payload = wa.templateName
    ? { messaging_product: 'whatsapp', to, type: 'template', template: {
        name: wa.templateName, language: { code: wa.templateLang },
        components: [{ type: 'body', parameters: buildTemplateParams(r).map((text) => ({ type: 'text', text })) }] } }
    : { messaging_product: 'whatsapp', to, type: 'text', text: { preview_url: false, body: buildText(r) } };

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${wa.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Erreur HTTP ${res.status}`);
  return data?.messages?.[0]?.id ?? null;
}

async function record(reservationId, statut, erreur = null) {
  if (reservationId == null) return;
  await query('INSERT INTO notifications(reservation_id, statut, erreur) VALUES ($1,$2,$3)',
    [reservationId, statut, erreur ? String(erreur).slice(0, 300) : null]);
}

// Ne lève jamais d'erreur : une notification en échec ne doit pas bloquer ni annuler une réservation.
export async function notifyNewReservation(reservationId) {
  try {
    const r = await loadReservation(reservationId);
    if (!r) return { statut: 'ECHEC', erreur: 'Réservation introuvable.' };
    if (!whatsappConfigured()) {
      await record(reservationId, 'NON_CONFIGUREE');
      return { statut: 'NON_CONFIGUREE' };
    }
    const to = (await getSettings()).whatsapp;
    if (!to) {
      const erreur = "Le numéro WhatsApp de l'institut n'est pas renseigné (Réglages).";
      await record(reservationId, 'ECHEC', erreur);
      return { statut: 'ECHEC', erreur };
    }
    await sendWhatsApp(to, r);
    await record(reservationId, 'ENVOYEE');
    return { statut: 'ENVOYEE' };
  } catch (err) {
    console.error('[notification WhatsApp]', err.message);
    try { await record(reservationId, 'ECHEC', err.message); } catch { /* ignoré */ }
    return { statut: 'ECHEC', erreur: err.message };
  }
}

// Message de test depuis les réglages (n'est rattaché à aucune réservation)
export async function sendTestNotification() {
  if (!whatsappConfigured()) return { statut: 'NON_CONFIGUREE' };
  const to = (await getSettings()).whatsapp;
  if (!to) return { statut: 'ECHEC', erreur: "Renseignez d'abord le numéro WhatsApp de l'institut." };
  try {
    await sendWhatsApp(to, { id: 0, nom: 'Test Notification', telephone: '221000000000', email: '',
      item_label: 'Message de test', date: new Date().toISOString().slice(0, 10), heure: '10:00', montant: 0 });
    return { statut: 'ENVOYEE' };
  } catch (err) { return { statut: 'ECHEC', erreur: err.message }; }
}
