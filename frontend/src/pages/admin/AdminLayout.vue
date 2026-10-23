<script setup>
import { LayoutDashboard, CalendarDays, Users, Tags, Settings, UserCog, LogOut, Plus, ArrowLeft } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import WalkInForm from '../../components/WalkInForm.vue';
import BrandLogo from '../../components/BrandLogo.vue';
import { auth, logout } from '../../composables/useAuth.js';
import { bus } from '../../composables/adminBus.js';

const router = useRouter();
const nav = [
  { to: '/admin', label: 'Accueil', icon: LayoutDashboard, exact: true },
  { to: '/admin/reservations', label: 'Réservations', icon: CalendarDays },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/catalogue', label: 'Tarifs', icon: Tags, owner: true },
  { to: '/admin/reglages', label: 'Réglages', icon: Settings, owner: true },
  { to: '/admin/equipe', label: 'Équipe', icon: UserCog, owner: true },
];
const items = () => nav.filter((n) => !n.owner || auth.user?.role === 'owner');
async function out() { await logout(); router.replace('/admin/login'); }
</script>

<template>
  <div class="shell">
    <header class="bar">
      <RouterLink to="/" class="back" title="Retour au site"><ArrowLeft :size="18" /><span class="long">Retour au site</span><span class="short">Retour</span></RouterLink>
      <strong class="t"><BrandLogo :size="30" /> <span>Gestion</span></strong>
      <button class="btn gold sm" @click="bus.walkIn = true"><Plus :size="16" /> Nouvelle cliente</button>
      <button class="icon-btn" aria-label="Se déconnecter" title="Se déconnecter" @click="out"><LogOut :size="20" /></button>
    </header>
    <nav class="nav" aria-label="Administration">
      <RouterLink v-for="n in items()" :key="n.to" :to="n.to" :exact-active-class="n.exact ? 'on' : ''" :active-class="n.exact ? '' : 'on'">
        <component :is="n.icon" :size="21" /><span>{{ n.label }}</span>
      </RouterLink>
    </nav>
    <main class="content"><RouterView /></main>
    <WalkInForm v-if="bus.walkIn" @close="bus.walkIn = false" />
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; padding-bottom: calc(76px + var(--safe-b)); }
.bar { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: .6rem; padding: .5rem .9rem; background: var(--black); color: #fff; }
.bar .t { flex: 1; display: flex; align-items: center; gap: .5rem; font-family: var(--serif); min-width: 0; }
.back { display: inline-flex; align-items: center; gap: .4rem; min-height: 44px; padding: 0 .85rem 0 .6rem; border: 1px solid rgba(255,255,255,.4); border-radius: 999px;
  color: #fff; text-decoration: none; font: 600 .85rem var(--sans); flex-shrink: 0; }
.back:hover { background: rgba(255,255,255,.12); } .short { display: none; }
@media (max-width: 560px) { .long { display: none; } .short { display: inline; } .bar .t { display: none; } .bar { justify-content: space-between; } .bar .btn { margin-left: auto; } }
.bar .icon-btn { color: #fff; }
.nav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 30; display: flex; background: #fff; border-top: 1px solid var(--line); padding-bottom: var(--safe-b); overflow-x: auto; }
.nav a { flex: 1; min-width: 0; display: grid; justify-items: center; gap: 2px; padding: .55rem .1rem; font-size: .66rem; text-decoration: none; color: var(--muted); }
.nav a.on { color: var(--choco); font-weight: 600; box-shadow: inset 0 3px 0 var(--gold); }
.content { max-width: 860px; margin: 0 auto; padding: 1rem; }
@media (min-width: 900px) {
  .shell { padding: 0 0 0 220px; }
  .bar { margin-left: -220px; padding-left: 1.25rem; }
  .nav { top: 58px; bottom: 0; width: 220px; right: auto; flex-direction: column; border-top: 0; border-right: 1px solid var(--line); padding: 1rem .5rem; }
  .nav a { flex: none; grid-auto-flow: column; justify-content: start; gap: .75rem; font-size: .95rem; padding: .7rem .9rem; border-radius: 10px; }
  .nav a.on { background: #F1EADB; box-shadow: none; }
}
</style>
