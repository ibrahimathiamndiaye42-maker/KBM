export const money = (n) => `${String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F')} F CFA`;
export const fdate = (s) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '');
export const today = () => new Date().toISOString().slice(0, 10);
export const STATUT = { EN_ATTENTE: 'En attente', CONFIRMEE: 'Confirmée', ANNULEE: 'Annulée', TERMINEE: 'Terminée' };
export const PAIEMENT = { EN_ATTENTE: 'Paiement en attente', CONFIRME: 'Payé', REFUSE: 'Paiement refusé' };
export const MOYENS = { ESPECES: 'Espèces', WAVE: 'Wave', ORANGE_MONEY: 'Orange Money', AUTRE: 'Autre' };

// Redimensionne une image dans le navigateur avant envoi (base64, sans préfixe)
export function compressImage(file, max = 1400, type = 'image/jpeg') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve({ mime: type, data: c.toDataURL(type, 0.82).split(',')[1] });
    };
    img.onerror = () => reject(new Error('Image illisible.'));
    img.src = URL.createObjectURL(file);
  });
}
