<script setup>
import { onMounted, reactive, ref } from 'vue';
import ImageField from '../../components/ImageField.vue';
import { api } from '../../api/http.js';
import { compressImage } from '../../composables/format.js';
import { loadSite, site } from '../../composables/useConfig.js';

const s = reactive({}); const error = ref(''); const ok = ref(''); const busy = ref(false);
const notif = ref(null);
const pw = reactive({ current: '', next: '' }); const gallery = ref([]);

const FIELDS = [
  ['Identité', [['business_name', 'Nom de l\'institut'], ['tagline', 'Slogan'], ['about_text', 'Texte « À propos »', 'textarea']]],
  ['Contact', [['phone', 'Téléphone'], ['whatsapp', 'WhatsApp (avec indicatif, ex. 221…)', 'tel'], ['email', 'E-mail', 'email'], ['address', 'Adresse', 'textarea'],
    ['hours', 'Horaires (texte affiché sur le site)', 'textarea'], ['instagram', 'Instagram (lien https://)'], ['facebook', 'Facebook (lien https://)'], ['tiktok', 'TikTok (lien https://)']]],
  ['Localisation Google Maps', [['maps_embed_url', 'Lien « src » de la carte intégrée', 'textarea'], ['maps_link', 'Lien Google Maps (bouton « Ouvrir »)']]],
  ['Réservation en ligne', [['payment_methods', 'Moyens de paiement acceptés (affichés aux clientes, ex. Wave, Orange Money, espèces)', 'textarea'], ['open_time', 'Ouverture', 'time'], ['close_time', 'Fermeture', 'time'], ['slot_minutes', 'Durée d\'un créneau (minutes)', 'number'], ['max_per_slot', 'Réservations simultanées par créneau', 'number']]],
  ['Couleurs', [['color_choco', 'Chocolat', 'color'], ['color_black', 'Noir', 'color'], ['color_cream', 'Crème', 'color'], ['color_gold', 'Doré', 'color'], ['color_sky', 'Bleu clair', 'color']]],
];

async function load() {
  Object.assign(s, (await api('/admin/settings')).settings);
  gallery.value = (await api('/admin/gallery')).items;
  notif.value = await api('/admin/notifications/status');
}
onMounted(() => load().catch((e) => { error.value = e.message; }));

async function flash(fn, msg) {
  error.value = ''; ok.value = ''; busy.value = true;
  try { await fn(); ok.value = msg; } catch (e) { error.value = e.message; } finally { busy.value = false; }
}
const save = () => flash(async () => { await api('/admin/settings', { method: 'PUT', body: { ...s } }); await loadSite(); }, 'Réglages enregistrés.');
const logo = (e) => flash(async () => {
  const file = e.target.files[0]; if (!file) return;
  await api('/admin/logo', { method: 'PUT', body: await compressImage(file, 512, 'image/png') }); await loadSite();
}, 'Logo mis à jour.');
const removeLogo = () => flash(async () => { await api('/admin/logo', { method: 'DELETE' }); await loadSite(); }, 'Logo retiré.');
const addPhoto = (e) => flash(async () => {
  const file = e.target.files[0]; if (!file) return;
  await api('/admin/gallery', { method: 'POST', body: { ...(await compressImage(file, 1400)), legende: '' } });
  await load(); await loadSite(); e.target.value = '';
}, 'Photo ajoutée.');
const delPhoto = (id) => flash(async () => { await api(`/admin/gallery/${id}`, { method: 'DELETE' }); await load(); await loadSite(); }, 'Photo supprimée.');
const aboutPick = (f) => flash(async () => {
  await api('/admin/media/about', { method: 'PUT', body: await compressImage(f, 1400) }); await loadSite();
}, 'Photo de l\'établissement mise à jour.');
const aboutClear = () => flash(async () => { await api('/admin/media/about', { method: 'DELETE' }); await loadSite(); }, 'Photo retirée.');
const testNotif = () => flash(async () => {
  const r = await api('/admin/notifications/test', { method: 'POST' });
  if (r.statut === 'ECHEC') throw new Error(r.erreur);
  if (r.statut === 'NON_CONFIGUREE') throw new Error('Notifications non activées sur le serveur.');
}, 'Message de test envoyé : vérifiez WhatsApp.');
const changePw = () => flash(async () => {
  await api('/auth/change-password', { method: 'POST', body: { ...pw } }); pw.current = ''; pw.next = '';
}, 'Mot de passe modifié.');
</script>
<template>
  <h1 style="font-size:1.6rem">Réglages</h1>
  <p v-if="error" class="err" role="alert">{{ error }}</p><p v-if="ok" class="okmsg" role="status">{{ ok }}</p>

  <form class="stack" novalidate @submit.prevent="save">
    <section v-for="[title, fields] in FIELDS" :key="title" class="card">
      <h2 style="font-size:1.2rem">{{ title }}</h2>
      <div v-for="[key, label, type] in fields" :key="key" class="field">
        <label :for="`s-${key}`">{{ label }}</label>
        <textarea v-if="type === 'textarea'" :id="`s-${key}`" v-model="s[key]"></textarea>
        <input v-else :id="`s-${key}`" :type="type || 'text'" v-model="s[key]" />
      </div>
    </section>
    <button class="btn block" :disabled="busy">Enregistrer les réglages</button>
  </form>

  <section class="card" style="margin-top:1rem" v-if="notif">
    <h2 style="font-size:1.2rem">Notifications WhatsApp</h2>
    <p v-if="notif.configured" class="okmsg" style="margin-bottom:.75rem">Activées : chaque nouvelle réservation est envoyée sur le WhatsApp de l'institut{{ notif.destination ? ` (+${notif.destination})` : '' }}.</p>
    <p v-else class="muted small">Non activées sur le serveur. Les réservations arrivent normalement dans l'application, mais aucun message WhatsApp n'est envoyé. Voir le guide de configuration (README).</p>
    <p v-if="notif.configured && !notif.destination" class="err">Renseignez d'abord le numéro WhatsApp dans « Contact » ci-dessus.</p>
    <button v-if="notif.configured" class="btn ghost" :disabled="busy" @click="testNotif">Envoyer un message de test</button>
  </section>

  <section class="card" style="margin-top:1rem">
    <h2 style="font-size:1.2rem">Logo</h2>
    <div class="field"><input type="file" accept="image/*" aria-label="Choisir un logo" @change="logo" /><small>Il apparaît sur le site, l'application et les reçus PDF.</small></div>
    <button v-if="site.logo" class="btn danger sm" @click="removeLogo">Retirer le logo</button>
  </section>

  <section class="card" style="margin-top:1rem">
    <h2 style="font-size:1.2rem">Photo de l'établissement</h2>
    <ImageField label="Affichée à côté du texte « À propos »" :current="site.aboutImage" hint="Une photo de l'institut (façade, salle de soins…)."
      @pick="aboutPick" @clear="aboutClear" />
  </section>

  <section class="card" style="margin-top:1rem">
    <h2 style="font-size:1.2rem">Galerie</h2>
    <div class="field"><input type="file" accept="image/*" aria-label="Ajouter une photo" @change="addPhoto" /></div>
    <div class="gal"><div v-for="g in gallery" :key="g.id"><img :src="`/api/public/gallery/${g.id}/image`" alt="" /><button class="btn danger sm block" @click="delPhoto(g.id)">Supprimer</button></div></div>
  </section>

  <form class="card" style="margin-top:1rem" @submit.prevent="changePw">
    <h2 style="font-size:1.2rem">Mon mot de passe</h2>
    <div class="field"><label for="pw1">Mot de passe actuel</label><input id="pw1" type="password" v-model="pw.current" autocomplete="current-password" /></div>
    <div class="field"><label for="pw2">Nouveau mot de passe (10 caractères minimum)</label><input id="pw2" type="password" v-model="pw.next" autocomplete="new-password" /></div>
    <button class="btn ghost block" :disabled="busy">Changer le mot de passe</button>
  </form>
</template>
<style scoped>.gal { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: .6rem; } .gal img { aspect-ratio: 1; object-fit: cover; width: 100%; border-radius: 10px; margin-bottom: .3rem; }</style>
