<script setup>
import { computed, ref } from 'vue';
import { Share, Smartphone, X } from 'lucide-vue-next';
import { installApp, isIos, isStandalone, pwa, setInstalled } from '../composables/usePwaInstall.js';

defineProps({ dismissible: { type: Boolean, default: false } });
const KEY = 'kmb_install_dismissed';
const hidden = ref((() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })());
const show = computed(() => !hidden.value && !isStandalone());
function dismiss() { hidden.value = true; try { localStorage.setItem(KEY, '1'); } catch { /* ignoré */ } }
</script>

<template>
  <section v-if="show" class="install card" aria-label="Application sur le téléphone">
    <Smartphone :size="26" class="ic" />
    <div class="txt">
      <template v-if="pwa.prompt">
        <strong>Installer l'application sur votre téléphone</strong>
        <p class="muted small">Ajoutez l'icône « KMB Gestion » à votre écran d'accueil pour ouvrir l'espace équipe en un geste.</p>
        <button class="btn gold sm" @click="installApp">Installer</button>
      </template>
      <template v-else-if="pwa.installed">
        <strong>L'application est déjà installée sur cet appareil</strong>
        <p class="muted small">Ouvrez-la depuis l'icône « KMB Gestion » de votre écran d'accueil.</p>
        <p class="small links"><RouterLink to="/admin/compte#application">Gérer ou désinstaller</RouterLink>
          <button type="button" class="link" @click="setInstalled(false)">Elle n'est plus installée ?</button></p>
      </template>
      <template v-else>
        <strong>Installer l'application sur votre téléphone</strong>
        <p v-if="isIos" class="muted small">Dans Safari : touchez <Share :size="14" style="vertical-align:-2px" /> <strong>Partager</strong>, puis <strong>Sur l'écran d'accueil</strong>.</p>
        <p v-else class="muted small">Dans Chrome : ouvrez le menu <strong>⋮</strong>, puis <strong>Installer l'application</strong> (ou « Ajouter à l'écran d'accueil »).</p>
        <p class="small links"><RouterLink to="/admin/compte#application">Voir le guide d'installation et de désinstallation</RouterLink></p>
      </template>
    </div>
    <button v-if="dismissible" class="icon-btn" aria-label="Masquer" @click="dismiss"><X :size="18" /></button>
  </section>
</template>

<style scoped>
.install { display: flex; gap: .8rem; align-items: flex-start; border-left: 4px solid var(--gold); margin-bottom: 1rem; }
.ic { color: var(--choco); flex-shrink: 0; margin-top: .15rem; } .txt { flex: 1; display: grid; gap: .35rem; justify-items: start; }
.txt p { margin: 0; } .links { display: flex; flex-wrap: wrap; gap: .25rem 1rem; }
.link { border: 0; background: none; color: var(--choco); text-decoration: underline; font: inherit; cursor: pointer; padding: 0; }
</style>
