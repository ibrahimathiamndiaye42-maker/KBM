<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '../../api/http.js';
import { auth } from '../../composables/useAuth.js';

const users = ref([]); const error = ref(''); const ok = ref('');
const f = reactive({ nom: '', email: '', telephone: '', password: '', role: 'staff' });
async function load() { try { users.value = (await api('/admin/users')).users; } catch (e) { error.value = e.message; } }
onMounted(load);
async function add() {
  error.value = ''; ok.value = '';
  try { await api('/admin/users', { method: 'POST', body: { ...f, telephone: f.telephone || undefined } });
    Object.assign(f, { nom: '', email: '', telephone: '', password: '', role: 'staff' }); ok.value = 'Compte créé.'; await load(); }
  catch (e) { error.value = e.message; }
}
async function toggle(u) {
  error.value = '';
  try { await api(`/admin/users/${u.id}`, { method: 'PATCH', body: { actif: !u.actif } }); await load(); } catch (e) { error.value = e.message; }
}
</script>
<template>
  <h1 style="font-size:1.6rem">Équipe</h1>
  <p v-if="error" class="err" role="alert">{{ error }}</p><p v-if="ok" class="okmsg">{{ ok }}</p>
  <div class="stack">
    <div v-for="u in users" :key="u.id" class="card u">
      <div><strong>{{ u.nom }}</strong> <span class="badge">{{ u.role === 'owner' ? 'Propriétaire' : 'Employée' }}</span>
        <span v-if="!u.actif" class="badge ANNULEE">Désactivé</span><br /><span class="muted small">{{ u.email }}</span></div>
      <button v-if="u.id !== auth.user.id" class="btn sm ghost" @click="toggle(u)">{{ u.actif ? 'Désactiver' : 'Réactiver' }}</button>
    </div>
  </div>
  <form class="card" style="margin-top:1rem" novalidate @submit.prevent="add">
    <h2 style="font-size:1.2rem">Ajouter un compte</h2>
    <div class="field"><label for="t-n">Nom</label><input id="t-n" v-model="f.nom" required /></div>
    <div class="field"><label for="t-e">E-mail</label><input id="t-e" type="email" v-model="f.email" required /></div>
    <div class="field"><label for="t-t">Téléphone</label><input id="t-t" type="tel" v-model="f.telephone" /></div>
    <div class="field"><label for="t-p">Mot de passe provisoire (10 caractères minimum)</label><input id="t-p" type="text" v-model="f.password" autocomplete="off" /></div>
    <div class="field"><label for="t-r">Rôle</label><select id="t-r" v-model="f.role"><option value="staff">Employée (réservations, clientes, paiements, reçus)</option><option value="owner">Propriétaire (accès complet)</option></select></div>
    <button class="btn block">Créer le compte</button>
  </form>
</template>
<style scoped>.u { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }</style>
