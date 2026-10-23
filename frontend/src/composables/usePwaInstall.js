import { reactive } from 'vue';

// Le navigateur ne dit pas directement si l'application est déjà installée. On le déduit de trois signaux :
//  - on tourne en mode « application installée » (standalone) ;
//  - l'événement `appinstalled` a été reçu ;
//  - le navigateur ne propose plus l'installation (pas de `beforeinstallprompt`) alors qu'on l'a déjà installée.
// Si le navigateur propose à nouveau l'installation, c'est que l'application a été désinstallée.
const FLAG = 'kmb_pwa_installed';
const read = () => { try { return localStorage.getItem(FLAG) === '1'; } catch { return false; } };

export const pwa = reactive({ prompt: null, installed: read() });

export function setInstalled(v) {
  pwa.installed = v;
  try { if (v) localStorage.setItem(FLAG, '1'); else localStorage.removeItem(FLAG); } catch { /* ignoré */ }
}

const ua = navigator.userAgent;
export const isIos = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isAndroid = /android/i.test(ua);
export const platform = isIos ? 'ios' : isAndroid ? 'android' : 'desktop';
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

if (isStandalone()) setInstalled(true);

// L'événement peut arriver avant l'affichage de l'écran : on le capture dès le démarrage.
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pwa.prompt = e; setInstalled(false); });
window.addEventListener('appinstalled', () => { pwa.prompt = null; setInstalled(true); });

export async function installApp() {
  if (!pwa.prompt) return false;
  pwa.prompt.prompt();
  const { outcome } = await pwa.prompt.userChoice;
  pwa.prompt = null;
  if (outcome === 'accepted') setInstalled(true);
  return outcome === 'accepted';
}
