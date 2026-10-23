<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import PwaManager from '../../components/PwaManager.vue';
import { api } from '../../api/http.js';
import { auth, loadSession, logout } from '../../composables/useAuth.js';

const router = useRouter();
const isOwner = computed(() => auth.user?.role === 'owner');
const msg = reactive({ profile: '', password: '', transfer: '' });
const err = reactive({ profile: '', password: '', transfer: '' });
const busy = ref('');

const profile = reactive({ nom: auth.user.nom, email: auth.user.email, telephone: auth.user.telephone || '', password: '' });
const emailChanged = computed(() => profile.email.trim().toLowerCase() !== auth.user.email);
const pw = reactive({ current: '', next: '' });
const candidates = ref([]); const transfer = reactive({ user_id: '', password: '', confirm: false });

async function run(key, fn, ok) {
  err[key] = ''; msg[key] = ''; busy.value = key;
  try { await fn(); msg[key] = ok; } catch (e) { err[key] = e.message; } finally { busy.value = ''; }
}
const saveProfile = () => run('profile', async () => {
  const { user } = await api('/auth/me', { method: 'PATCH', body: { ...profile, password: profile.password || undefined } });
  auth.user = { ...auth.user, ...user }; profile.password = '';
}, 'Vos informations sont enregistrées.');
const savePassword = () => run('password', async () => {
  await api('/auth/change-password', { method: 'POST', body: { ...pw } }); pw.current = ''; pw.next = '';
}, 'Mot de passe modifié.');

onMounted(async () => {
  if (!isOwner.value) return;
  try { candidates.value = (await api('/admin/users')).users.filter((u) => u.actif && u.id !== auth.user.id); } catch { /* affiché plus bas */ }
});
const target = computed(() => candidates.value.find((u) => u.id === Number(transfer.user_id)));
const doTransfer = () => run('transfer', async () => {
  await api('/admin/users/transfer-ownership', { method: 'POST', body: { user_id: Number(transfer.user_id), password: transfer.password } });
  sessionStorage.setItem('kmb_flash', `Le rôle de propriétaire a été transféré à ${target.value.nom}. Vous êtes maintenant employée.`);
  await loadSession(); router.replace('/admin');
}, '');
async function out() { await logout(); router.replace('/admin/login'); }
</script>

<template>
  <h1 style="font-size:1.6rem">Mon compte</h1>
  <p class="muted" style="margin-top:-.4rem">{{ isOwner ? 'Propriétaire' : 'Employée' }}</p>

  <div class="stack">
    <form class="card" novalidate @submit.prevent="saveProfile">
      <h2 class="h">Mes informations</h2>
      <p v-if="err.profile" class="err" role="alert">{{ err.profile }}</p><p v-if="msg.profile" class="okmsg" role="status">{{ msg.profile }}</p>
      <div class="field"><label for="a-nom">Nom</label><input id="a-nom" v-model="profile.nom" autocomplete="name" required /></div>
      <div class="field"><label for="a-mail">E-mail (sert à la connexion)</label><input id="a-mail" type="email" v-model="profile.email" autocomplete="email" required /></div>
      <div class="field"><label for="a-tel">Téléphone</label><input id="a-tel" type="tel" v-model="profile.telephone" autocomplete="tel" /></div>
      <div v-if="emailChanged" class="field"><label for="a-pw">Mot de passe actuel</label><input id="a-pw" type="password" v-model="profile.password" autocomplete="current-password" /><small>Demandé pour changer l'adresse e-mail.</small></div>
      <button class="btn block" :disabled="busy === 'profile'">Enregistrer</button>
    </form>

    <form class="card" novalidate @submit.prevent="savePassword">
      <h2 class="h">Mot de passe</h2>
      <p v-if="err.password" class="err" role="alert">{{ err.password }}</p><p v-if="msg.password" class="okmsg" role="status">{{ msg.password }}</p>
      <div class="field"><label for="p1">Mot de passe actuel</label><input id="p1" type="password" v-model="pw.current" autocomplete="current-password" /></div>
      <div class="field"><label for="p2">Nouveau mot de passe (10 caractères minimum)</label><input id="p2" type="password" v-model="pw.next" autocomplete="new-password" /></div>
      <button class="btn ghost block" :disabled="busy === 'password'">Changer le mot de passe</button>
    </form>

    <form v-if="isOwner" class="card transfer" novalidate @submit.prevent="doTransfer">
      <h2 class="h">Transférer le rôle de propriétaire</h2>
      <p class="muted small" style="margin-top:0">Le propriétaire gère l'application : tarifs, réglages, comptes de l'équipe. En transférant ce rôle, la personne choisie devient propriétaire et <strong>vous devenez employée</strong> (réservations, clientes, paiements et reçus). Vous ne pourrez plus annuler ce transfert vous-même.</p>
      <p v-if="err.transfer" class="err" role="alert">{{ err.transfer }}</p>
      <template v-if="candidates.length">
        <div class="field"><label for="t-u">Nouvelle propriétaire</label>
          <select id="t-u" v-model="transfer.user_id"><option value="" disabled>Choisir une personne</option>
            <option v-for="u in candidates" :key="u.id" :value="u.id">{{ u.nom }} — {{ u.email }}</option></select></div>
        <div class="field"><label for="t-p">Votre mot de passe (confirmation)</label><input id="t-p" type="password" v-model="transfer.password" autocomplete="current-password" /></div>
        <div class="field"><label class="chk"><input type="checkbox" v-model="transfer.confirm" /> Je comprends que je perds les droits de propriétaire.</label></div>
        <button class="btn danger block" :disabled="busy === 'transfer' || !transfer.user_id || !transfer.password || !transfer.confirm">Transférer le rôle</button>
      </template>
      <p v-else class="muted small">Aucune autre personne disponible. Créez d'abord son compte dans <RouterLink to="/admin/equipe">Équipe</RouterLink> : vous pouvez même lui donner directement le rôle « Propriétaire » pour partager la gestion.</p>
    </form>

    <PwaManager />

    <button class="btn ghost block" type="button" @click="out">Se déconnecter</button>
  </div>
</template>

<style scoped>
.h { font-size: 1.2rem; } .transfer { border-left: 4px solid var(--bad); }
.chk { display: flex; gap: .6rem; align-items: flex-start; font-weight: 500 !important; } .chk input { width: 22px !important; min-height: 22px !important; flex-shrink: 0; margin-top: .1rem; }
</style>
