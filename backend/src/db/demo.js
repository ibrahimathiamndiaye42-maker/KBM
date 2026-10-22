// Données de DÉMONSTRATION. Refuse de tourner en production pour ne jamais
// mélanger données fictives et données réelles. À utiliser sur une base de test séparée.
import { env } from '../config/env.js';
import { pool } from './pool.js';

if (env.isProd) {
  console.error('Refusé : NODE_ENV=production. Les données de démonstration sont interdites en production.');
  process.exit(1);
}

const CLIENTS = [['Aminata Ndiaye', '221770000001'], ['Fatou Diop', '221770000002'], ['Awa Sow', '221770000003']];

async function run() {
  const svc = (await pool.query('SELECT id, nom, prix FROM services ORDER BY id')).rows;
  if (!svc.length) throw new Error("Lancez d'abord `npm run seed`.");
  for (const [i, [nom, tel]] of CLIENTS.entries()) {
    const c = (await pool.query(
      'INSERT INTO clients(nom, telephone) VALUES ($1,$2) ON CONFLICT (telephone) DO UPDATE SET nom = EXCLUDED.nom RETURNING id', [nom, tel])).rows[0];
    const s = svc[(i * 3) % svc.length];
    const r = (await pool.query(
      `INSERT INTO reservations(client_id, service_id, item_label, date, heure, montant, statut, source, notes)
       VALUES ($1,$2,$3, CURRENT_DATE + $4::int, '10:00', $5, 'CONFIRMEE', 'EN_LIGNE', 'DÉMO') RETURNING id`,
      [c.id, s.id, s.nom, i, s.prix])).rows[0];
    await pool.query('INSERT INTO payments(reservation_id, montant) VALUES ($1,$2)', [r.id, s.prix]);
  }
  console.log(`${CLIENTS.length} réservations de démonstration créées (notes = « DÉMO »).`);
}
run().then(() => pool.end()).catch((e) => { console.error(e.message); process.exit(1); });
