import PDFDocument from 'pdfkit';
import { query } from '../db/pool.js';
import { getSettings } from './settings.js';

const fmtAmount = (n) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F CFA`;
const METHODS = { ESPECES: 'Espèces', WAVE: 'Wave', ORANGE_MONEY: 'Orange Money', AUTRE: 'Autre' };
const dateFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Dakar', day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Dakar', hour: '2-digit', minute: '2-digit' });

export async function loadReceipt(id) {
  const { rows } = await query(
    `SELECT r.*, c.nom AS client_nom, c.telephone AS client_tel, res.item_label,
            res.date AS res_date, to_char(res.heure,'HH24:MI') AS res_heure
       FROM receipts r
       JOIN clients c ON c.id = r.client_id
       JOIN reservations res ON res.id = r.reservation_id
      WHERE r.id = $1`, [id]);
  return rows[0];
}

export async function renderReceipt(receipt, stream) {
  const s = await getSettings();
  const logo = (await query(`SELECT mime, data FROM assets WHERE key = 'logo'`)).rows[0];
  const choco = s.color_choco, gold = s.color_gold, dark = s.color_black;

  const doc = new PDFDocument({ size: 'A5', margin: 0, info: { Title: `Reçu ${receipt.numero}`, Author: s.business_name } });
  doc.pipe(stream);
  const W = doc.page.width;
  const M = 36;

  // En-tête
  doc.rect(0, 0, W, 118).fill(choco);
  doc.rect(0, 118, W, 3).fill(gold);
  if (logo && logo.mime !== 'image/webp') {
    doc.image(logo.data, M, 26, { fit: [64, 64] });
  } else {
    doc.circle(M + 32, 58, 30).lineWidth(1.5).stroke(gold);
    doc.fillColor(gold).font('Times-Bold').fontSize(20).text('KMB', M, 48, { width: 64, align: 'center' });
  }
  doc.fillColor('#FFFFFF').font('Times-Bold').fontSize(18).text(s.business_name, M + 80, 34, { width: W - M * 2 - 80 });
  doc.font('Helvetica').fontSize(9).fillColor('#E8DCC3').text('Institut de beauté', M + 80, 58);
  const contact = [s.address, s.phone && `Tél : ${s.phone}`, s.whatsapp && `WhatsApp : ${s.whatsapp}`].filter(Boolean).join('  |  ');
  if (contact) doc.fontSize(8).text(contact, M + 80, 72, { width: W - M * 2 - 80 });

  // Titre + numéro
  doc.fillColor(dark).font('Helvetica-Bold').fontSize(15).text('REÇU DE PAIEMENT', M, 144);
  doc.font('Helvetica').fontSize(10).fillColor('#766A63').text(`N° ${receipt.numero}`, M, 164);
  doc.fillColor(dark).fontSize(9).text(
    `${dateFmt.format(new Date(receipt.paid_at))} à ${timeFmt.format(new Date(receipt.paid_at))}`,
    M, 164, { width: W - M * 2, align: 'right' });

  // Lignes
  const rows = [
    ['Cliente', receipt.client_nom],
    ['Téléphone', receipt.client_tel],
    ['Prestation', receipt.item_label],
    ['Date du rendez-vous', receipt.res_date.split('-').reverse().join('/')],
    ['Moyen de paiement', METHODS[receipt.moyen] ?? '—'],
  ];
  let y = 196;
  for (const [label, value] of rows) {
    doc.moveTo(M, y - 6).lineTo(W - M, y - 6).lineWidth(0.5).stroke('#E4D9C6');
    doc.font('Helvetica').fontSize(9).fillColor('#766A63').text(label, M, y);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(dark).text(String(value), M + 130, y - 1, { width: W - M * 2 - 130, align: 'right' });
    y += 30;
  }

  // Montant
  doc.roundedRect(M, y + 6, W - M * 2, 56, 6).fill('#F8F4EC');
  doc.fillColor('#766A63').font('Helvetica').fontSize(10).text('Montant payé', M + 16, y + 28);
  doc.fillColor(choco).font('Times-Bold').fontSize(22).text(fmtAmount(receipt.montant), M + 120, y + 22, { width: W - M * 2 - 136, align: 'right' });

  // Cachet PAYÉ
  const sy = y + 96;
  doc.save().rotate(-8, { origin: [W - M - 70, sy + 20] });
  doc.roundedRect(W - M - 130, sy, 120, 38, 4).lineWidth(2).stroke('#2E7D4F');
  doc.fillColor('#2E7D4F').font('Helvetica-Bold').fontSize(18).text('PAYÉ', W - M - 130, sy + 9, { width: 120, align: 'center' });
  doc.restore();

  doc.fillColor('#766A63').font('Helvetica').fontSize(8)
    .text('Merci de votre confiance. Ce reçu atteste du paiement de la prestation ci-dessus.', M, sy + 10, { width: W - M * 2 - 150 });

  // Pied
  doc.rect(0, doc.page.height - 12, W, 12).fill(gold);
  doc.end();
}
