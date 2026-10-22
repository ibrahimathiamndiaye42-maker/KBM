// Données de référence du système RÉEL : services, packs et réglages par défaut.
// Aucune coordonnée n'est inventée : téléphone, WhatsApp, adresse, etc. restent vides
// jusqu'à ce que le propriétaire les renseigne dans l'administration.
// Idempotent : peut être relancé sans écraser ce que le propriétaire a modifié.
import { pool } from './pool.js';
import { DEFAULT_SETTINGS } from '../services/settings.js';

const SERVICES = [
  ['Damp traditionnel', 5000], ['Damp complet', 10000], ['Hamam', 5000],
  ['Gommage', 5000], ['Pédicure / Manucure', 5000], ['Soins du visage', 5000],
  ['Cire', 3000], ['Ventouse', 5000], ['Massage relaxant', 5000],
];
const PACKS = [
  ['Pack Me Time', 20000], ['Pack Me Time Plus', 25000],
  ['Pack Complet', 30000], ['Pack Accouchement', 15000],
];

async function run() {
  const hasServices = (await pool.query('SELECT 1 FROM services LIMIT 1')).rowCount > 0;
  if (!hasServices) {
    for (const [i, [nom, prix]] of SERVICES.entries())
      await pool.query('INSERT INTO services(nom, prix, ordre) VALUES ($1,$2,$3)', [nom, prix, i]);
    console.log(`${SERVICES.length} services créés.`);
  }
  const hasPacks = (await pool.query('SELECT 1 FROM packs LIMIT 1')).rowCount > 0;
  if (!hasPacks) {
    // Descriptions volontairement vides : la composition des packs est saisie par le propriétaire.
    for (const [i, [nom, prix]] of PACKS.entries())
      await pool.query('INSERT INTO packs(nom, prix, ordre) VALUES ($1,$2,$3)', [nom, prix, i]);
    console.log(`${PACKS.length} packs créés.`);
  }
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS))
    await pool.query('INSERT INTO settings(key, value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING', [key, value]);
  console.log('Réglages par défaut en place.');
}
run().then(() => pool.end()).catch((e) => { console.error(e); process.exit(1); });
