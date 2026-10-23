<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { LogOut, UserRound } from 'lucide-vue-next';
import { auth, logout } from '../composables/useAuth.js';

const router = useRouter();
const open = ref(false); const root = ref(null);
const initial = computed(() => (auth.user?.nom || '?').trim()[0].toUpperCase());
const onDoc = (e) => { if (root.value && !root.value.contains(e.target)) open.value = false; };
const onKey = (e) => { if (e.key === 'Escape') open.value = false; };
onMounted(() => { document.addEventListener('click', onDoc); document.addEventListener('keydown', onKey); });
onBeforeUnmount(() => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); });
function go() { open.value = false; router.push('/admin/compte'); }
async function out() { open.value = false; await logout(); router.replace('/admin/login'); }
</script>

<template>
  <div ref="root" class="am">
    <button class="av" type="button" aria-haspopup="menu" :aria-expanded="open" aria-label="Mon compte" @click="open = !open">{{ initial }}</button>
    <div v-if="open" class="pop" role="menu">
      <div class="who"><strong>{{ auth.user.nom }}</strong><span>{{ auth.user.email }}</span><em>{{ auth.user.role === 'owner' ? 'Propriétaire' : 'Employée' }}</em></div>
      <button role="menuitem" type="button" @click="go"><UserRound :size="18" /> Mon compte</button>
      <button role="menuitem" type="button" @click="out"><LogOut :size="18" /> Se déconnecter</button>
    </div>
  </div>
</template>

<style scoped>
.am { position: relative; }
.av { width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid var(--gold); background: transparent; color: var(--gold); font: 700 1rem var(--serif); cursor: pointer; }
.pop { position: absolute; right: 0; top: 52px; min-width: 240px; background: #fff; color: var(--ink); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 16px 36px -12px rgba(0,0,0,.4); padding: .4rem; z-index: 60; }
.who { display: grid; gap: .1rem; padding: .6rem .7rem .7rem; border-bottom: 1px solid var(--line); margin-bottom: .3rem; font-size: .85rem; }
.who span { color: var(--muted); word-break: break-all; } .who em { font-style: normal; font-size: .75rem; color: var(--choco); font-weight: 600; }
.pop button { display: flex; align-items: center; gap: .6rem; width: 100%; min-height: 46px; padding: 0 .7rem; border: 0; background: none; border-radius: 10px; font: 500 .95rem var(--sans); cursor: pointer; color: inherit; text-align: left; }
.pop button:hover { background: #F1EADB; }
</style>
