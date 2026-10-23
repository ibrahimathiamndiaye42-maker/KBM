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
// Envoie le reçu à la cliente : sur téléphone, la feuille de partage s'ouvre avec le PDF déjà joint
// (choisir WhatsApp puis la cliente). Sur ordinateur, le PDF est téléchargé et la conversation WhatsApp
// de la cliente s'ouvre avec un message prêt : il reste à joindre le fichier.
export async function shareReceipt(id, numero, client = {}) {
  const file = new File([await load(id)], `${numero}.pdf`, { type: 'application/pdf' });
  const text = `Bonjour${client.nom ? ` ${client.nom}` : ''}, voici votre reçu de réservation ${numero}. Votre réservation est confirmée. Merci de votre confiance !`;
  if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: `Reçu ${numero}`, text }); return; }
  await downloadReceipt(id, numero);
  if (client.telephone) window.open(`https://wa.me/${client.telephone}?text=${encodeURIComponent(text)}`, '_blank');
}
