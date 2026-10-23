<script setup>
import { ref } from 'vue';
import { ArrowLeft } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import InstallCard from '../../components/InstallCard.vue';
import BrandLogo from '../../components/BrandLogo.vue';
import { login } from '../../composables/useAuth.js';
import { site } from '../../composables/useConfig.js';

const router = useRouter();
const email = ref(''); const password = ref(''); const error = ref(''); const busy = ref(false);
async function submit() {
  error.value = ''; busy.value = true;
  try { await login(email.value, password.value); router.replace('/admin'); }
  catch (e) { error.value = e.message; } finally { busy.value = false; }
}
</script>
<template>
  <main class="wrap">
    <form class="card box" @submit.prevent="submit">
      <div class="logo"><BrandLogo :size="64" /></div>
      <h1>{{ site.settings.business_name || 'Keer Maam Birabar' }}</h1>
      <p class="muted">Espace équipe</p>
      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <div class="field"><label for="l-mail">E-mail</label><input id="l-mail" type="email" v-model="email" autocomplete="username" required /></div>
      <div class="field"><label for="l-pw">Mot de passe</label><input id="l-pw" type="password" v-model="password" autocomplete="current-password" required /></div>
      <button class="btn block" :disabled="busy">{{ busy ? 'Connexion…' : 'Se connecter' }}</button>
      <RouterLink to="/" class="btn ghost block" style="margin-top:.75rem"><ArrowLeft :size="18" /> Retour au site</RouterLink>
    </form>
    <div class="box-install"><InstallCard /></div>
  </main>
</template>
<style scoped>
.wrap { min-height: 100vh; display: grid; place-content: center; justify-items: center; gap: 1rem; padding: 1rem; background: var(--black); }
.box-install { width: 100%; max-width: 400px; text-align: left; }
.box { width: 100%; max-width: 400px; text-align: center; padding: 1.75rem; }
.box .field { text-align: left; } .logo { display: grid; justify-items: center; background: var(--choco); width: 88px; height: 88px; border-radius: 50%; place-content: center; margin: 0 auto 1rem; }
h1 { font-size: 1.5rem; margin-bottom: .1rem; }
</style>
