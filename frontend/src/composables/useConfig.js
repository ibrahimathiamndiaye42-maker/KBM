import { reactive } from 'vue';
import { api } from '../api/http.js';

export const site = reactive({ loaded: false, settings: {}, services: [], packs: [], gallery: [], logo: null });

export async function loadSite() {
  const d = await api('/public/config');
  Object.assign(site, { settings: d.settings, services: d.services, packs: d.packs, gallery: d.gallery,
    logo: d.logo_version ? `/api/public/logo?v=${d.logo_version}` : null, loaded: true });
  const s = d.settings, root = document.documentElement.style;
  root.setProperty('--choco', s.color_choco); root.setProperty('--black', s.color_black);
  root.setProperty('--cream', s.color_cream); root.setProperty('--gold', s.color_gold); root.setProperty('--sky', s.color_sky);
  document.title = `${s.business_name} — Institut de beauté`;
}

export const waLink = (text = '') =>
  site.settings.whatsapp ? `https://wa.me/${site.settings.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null;
