import { reactive } from 'vue';

// Android / Chrome : l'événement `beforeinstallprompt` peut arriver avant l'affichage de l'écran,
// on le capture donc dès le démarrage de l'application.
export const pwa = reactive({ prompt: null, installed: false });

const ua = navigator.userAgent;
export const isIos = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pwa.prompt = e; });
window.addEventListener('appinstalled', () => { pwa.installed = true; pwa.prompt = null; });

export async function installApp() {
  if (!pwa.prompt) return false;
  pwa.prompt.prompt();
  const { outcome } = await pwa.prompt.userChoice;
  pwa.prompt = null;
  return outcome === 'accepted';
}
