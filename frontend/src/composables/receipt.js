import { fetchBlob } from '../api/http.js';

const load = async (id) => new Blob([await fetchBlob(`/admin/receipts/${id}/pdf`)], { type: 'application/pdf' });

export async function viewReceipt(id) {
  window.open(URL.createObjectURL(await load(id)), '_blank');
}
export async function downloadReceipt(id, numero) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(await load(id)); a.download = `${numero}.pdf`; a.click();
}
export async function printReceipt(id) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;width:0;height:0;border:0';
  f.src = URL.createObjectURL(await load(id));
  f.onload = () => { f.contentWindow.focus(); f.contentWindow.print(); };
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 60000);
}
// --- Envoi à la cliente ---
// Lien non devinable vers le PDF (ouvert sans connexion). Il passe par le même domaine que le site.
export const receiptLink = (token) => `${location.origin}/api/public/receipts/${token}/pdf`;

export const receiptMessage = ({ nom, numero, token }) =>
  `Bonjour${nom ? ` ${nom}` : ''}, merci pour votre confiance. Votre réservation est confirmée. `
  + `Voici votre reçu ${numero} (PDF) : ${receiptLink(token)}`;

// Lien WhatsApp ouvrant directement la conversation avec la cliente, message prêt à envoyer.
// C'est un simple lien : il s'ouvre au clic, sans attente réseau, donc jamais bloqué par le navigateur.
export const receiptWaUrl = ({ telephone, nom, numero, token }) =>
  `https://wa.me/${String(telephone).replace(/\D/g, '')}?text=${encodeURIComponent(receiptMessage({ nom, numero, token }))}`;

// Variante « joindre le fichier » : le PDF doit être chargé AVANT le clic, car le partage natif
// n'est autorisé que dans le geste de l'utilisateur (une attente réseau l'annule).
export async function prefetchReceiptFile(id, numero) {
  return new File([await load(id)], `${numero}.pdf`, { type: 'application/pdf' });
}
export const canShareFile = (file) => Boolean(file && navigator.canShare?.({ files: [file] }));
export function shareFile(file, text) {
  return navigator.share({ files: [file], title: file.name, text });
}
