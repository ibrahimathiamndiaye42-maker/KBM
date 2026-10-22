import { query } from '../db/pool.js';

// Clés de configuration. `public: true` = exposée au site public.
export const SETTING_DEFS = {
  business_name:  { public: true,  default: 'KEER MAAM BIRABAR' },
  tagline:        { public: true,  default: 'Votre beauté, notre priorité' },
  about_text:     { public: true,  default: '' },
  phone:          { public: true,  default: '' },
  whatsapp:       { public: true,  default: '' },   // chiffres avec indicatif, ex. 221XXXXXXXXX
  email:          { public: true,  default: '' },
  address:        { public: true,  default: '' },
  maps_embed_url: { public: true,  default: '' },   // src de l'iframe « Intégrer une carte » Google Maps
  maps_link:      { public: true,  default: '' },
  hours:          { public: true,  default: '' },   // texte libre, ex. « Lun–Sam : 9h–19h »
  instagram:      { public: true,  default: '' },
  facebook:       { public: true,  default: '' },
  tiktok:         { public: true,  default: '' },
  color_choco:    { public: true,  default: '#56372F' },
  color_black:    { public: true,  default: '#1A110F' },
  color_cream:    { public: true,  default: '#F8F4EC' },
  color_gold:     { public: true,  default: '#C9A24D' },
  color_sky:      { public: true,  default: '#A9CCE3' },
  open_time:      { public: true,  default: '09:00' },
  close_time:     { public: true,  default: '19:00' },
  slot_minutes:   { public: true,  default: '60' },
  max_per_slot:   { public: true,  default: '2' },  // réservations simultanées acceptées par créneau
};

export const DEFAULT_SETTINGS = Object.fromEntries(
  Object.entries(SETTING_DEFS).map(([k, v]) => [k, v.default]),
);

export async function getSettings() {
  const { rows } = await query('SELECT key, value FROM settings');
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in SETTING_DEFS) out[r.key] = r.value;
  return out;
}

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
export function fromMinutes(n) {
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}
