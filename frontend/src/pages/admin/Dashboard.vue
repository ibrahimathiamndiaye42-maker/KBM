<script setup>
import { onMounted, ref, watch } from 'vue';
import InstallCard from '../../components/InstallCard.vue';
import ReservationRow from '../../components/ReservationRow.vue';
import ReservationSheet from '../../components/ReservationSheet.vue';
import { api } from '../../api/http.js';
import { bus } from '../../composables/adminBus.js';
import { auth } from '../../composables/useAuth.js';
import { money } from '../../composables/format.js';

const flash = (() => { const m = sessionStorage.getItem('kmb_flash'); sessionStorage.removeItem('kmb_flash'); return m; })();
const d = ref(null); const error = ref(''); const openId = ref(null);
async function load() { try { d.value = await api('/admin/dashboard'); } catch (e) { error.value = e.message; } }
onMounted(load); watch(() => bus.tick, load);
const tiles = (x) => [
  ['Aujourd\'hui', x.aujourdhui], ['À venir', x.a_venir], ['En attente', x.en_attente], ['Confirmées', x.confirmees],
  ['Clientes', x.clients], ['Prestations réalisées', x.prestations], ['Paiements enregistrés', x.paiements],
];
</script>
<template>
  <h1 style="font-size:1.6rem">Bonjour {{ auth.user?.nom.split(' ')[0] }}</h1>
  <p v-if="flash" class="okmsg" role="status">{{ flash }}</p>
  <InstallCard dismissible />
  <p v-if="error" class="err">{{ error }}</p>
  <template v-if="d">
    <div class="tiles">
      <div v-for="[l, v] in tiles(d)" :key="l" class="card tile"><b>{{ v }}</b><span class="muted small">{{ l }}</span></div>
      <div class="card tile wide"><b>{{ money(d.total_encaisse) }}</b><span class="muted small">Total des paiements confirmés</span></div>
    </div>
    <h2 class="h">Aujourd'hui</h2>
    <div class="stack"><p v-if="!d.aujourdhui_liste.length" class="muted">Aucune réservation aujourd'hui.</p>
      <ReservationRow v-for="r in d.aujourdhui_liste" :key="r.id" :r="r" :show-date="false" @click="openId = r.id" /></div>
    <h2 class="h">À venir</h2>
    <div class="stack"><p v-if="!d.a_venir_liste.length" class="muted">Rien de prévu pour le moment.</p>
      <ReservationRow v-for="r in d.a_venir_liste" :key="r.id" :r="r" @click="openId = r.id" /></div>
  </template>
  <ReservationSheet v-if="openId" :id="openId" @close="openId = null" />
</template>
<style scoped>
.tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: .6rem; margin-bottom: 1.5rem; }
.tile { display: grid; } .tile b { font: 700 1.7rem var(--serif); color: var(--choco); } .wide { grid-column: 1 / -1; }
@media (min-width: 640px) { .tiles { grid-template-columns: repeat(4, 1fr); } .wide { grid-column: span 2; } }
.h { font-size: 1.2rem; margin: 1.25rem 0 .6rem; }
</style>
