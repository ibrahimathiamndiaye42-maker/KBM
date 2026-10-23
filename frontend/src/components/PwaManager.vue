<script setup>
import { ref } from 'vue';
import { CheckCircle2, Smartphone } from 'lucide-vue-next';
import { installApp, isStandalone, platform, pwa, setInstalled } from '../composables/usePwaInstall.js';

const tab = ref(platform);
const tabs = [['android', 'Android'], ['ios', 'iPhone'], ['desktop', 'Ordinateur']];
const standalone = isStandalone();

const GUIDE = {
  android: {
    install: ['Ouvrez le site dans Chrome.', 'Touchez le bouton « Installer » ci-dessus, ou le menu ⋮ puis « Installer l\'application » (ou « Ajouter à l\'écran d\'accueil »).', 'Confirmez : l\'icône « KMB Gestion » apparaît sur l\'écran d\'accueil.'],
    remove: ['Faites un appui long sur l\'icône « KMB Gestion » de l\'écran d\'accueil.', 'Touchez « Désinstaller » (ou « Supprimer »), puis confirmez.', 'Autre chemin : Paramètres → Applications → KMB Gestion → Désinstaller.'],
  },
  ios: {
    install: ['Ouvrez le site dans Safari.', 'Touchez le bouton Partager (carré avec une flèche), puis « Sur l\'écran d\'accueil ».', 'Touchez « Ajouter » : l\'icône apparaît sur l\'écran d\'accueil.'],
    remove: ['Faites un appui long sur l\'icône « KMB Gestion ».', 'Touchez « Supprimer l\'app », puis « Supprimer ».'],
  },
  desktop: {
    install: ['Dans Chrome ou Edge, repérez l\'icône d\'installation à droite de la barre d\'adresse.', 'Cliquez dessus puis « Installer » (ou menu ⋮ → « Installer… »).'],
    remove: ['Ouvrez l\'application installée.', 'Cliquez sur le menu ⋮ en haut à droite de sa fenêtre, puis « Désinstaller… ».', 'Autre chemin : tapez chrome://apps dans Chrome, clic droit sur l\'application → Supprimer.'],
  },
};
</script>

<template>
  <section id="application" class="card pm">
    <h2><Smartphone :size="22" /> Application sur le téléphone</h2>

    <p v-if="standalone" class="state ok"><CheckCircle2 :size="18" /> Vous utilisez l'application installée.</p>
    <template v-else>
      <p v-if="pwa.prompt" class="state">L'application n'est pas encore installée sur cet appareil.</p>
      <p v-else-if="pwa.installed" class="state ok"><CheckCircle2 :size="18" /> L'application est déjà installée sur cet appareil : ouvrez-la depuis l'icône « KMB Gestion » de l'écran d'accueil.</p>
      <p v-else class="state">Installez l'application pour l'ouvrir en un geste, comme une application du téléphone.</p>
      <button v-if="pwa.prompt" class="btn gold" @click="installApp">Installer l'application</button>
      <button v-if="pwa.installed && !standalone" class="link" type="button" @click="setInstalled(false)">Elle n'est plus installée ? Réafficher les instructions d'installation</button>
    </template>

    <div class="tabs" role="tablist" aria-label="Type d'appareil">
      <button v-for="[k, l] in tabs" :key="k" role="tab" type="button" :aria-selected="tab === k" :class="{ on: tab === k }" @click="tab = k">{{ l }}</button>
    </div>
    <div class="guide">
      <h3>Installer</h3><ol><li v-for="(t, i) in GUIDE[tab].install" :key="i">{{ t }}</li></ol>
      <h3>Désinstaller</h3><ol><li v-for="(t, i) in GUIDE[tab].remove" :key="i">{{ t }}</li></ol>
    </div>
    <p class="muted small">Une page web ne peut pas supprimer elle-même son icône : c'est une action du téléphone, qui protège vos applications. Les noms des menus peuvent varier selon la marque et la version.</p>
  </section>
</template>

<style scoped>
.pm h2 { display: flex; align-items: center; gap: .5rem; font-size: 1.2rem; }
.state { margin: 0 0 .75rem; display: flex; gap: .5rem; align-items: flex-start; } .state.ok { color: var(--ok); } .state svg { flex-shrink: 0; margin-top: .15rem; }
.tabs { display: flex; gap: .4rem; margin: 1rem 0 .5rem; }
.tabs button { flex: 1; min-height: 42px; border: 1.5px solid var(--line); border-radius: 999px; background: #fff; font: 600 .88rem var(--sans); cursor: pointer; color: var(--ink); }
.tabs button.on { background: var(--choco); border-color: var(--choco); color: #fff; }
.guide h3 { font: 700 .95rem var(--sans); color: var(--choco); margin: .75rem 0 .25rem; } .guide ol { margin: 0; padding-left: 1.2rem; display: grid; gap: .3rem; font-size: .93rem; }
.link { border: 0; background: none; color: var(--choco); text-decoration: underline; font: 600 .85rem var(--sans); cursor: pointer; padding: .4rem 0; text-align: left; }
</style>
