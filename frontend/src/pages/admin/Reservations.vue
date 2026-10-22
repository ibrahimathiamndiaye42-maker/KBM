<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import ReservationRow from '../../components/ReservationRow.vue';
import ReservationSheet from '../../components/ReservationSheet.vue';
import { api } from '../../api/http.js';
import { bus } from '../../composables/adminBus.js';
import { PAIEMENT, STATUT } from '../../composables/format.js';

const f = reactive({ q: '', statut: '', paiement: '', periode: 'all' });
const list = ref([]); const error = ref(''); const openId = ref(null); const loading = ref(false);
let timer;
async function load() {
  loading.value = true; error.value = '';
  const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
  try { list.value = (await api(`/admin/reservations?${p}`)).reservations; }
  catch (e) { error.value = e.message; } finally { loading.value = false; }
}
onMounted(load);
watch(() => bus.tick, load);
watch(() => [f.statut, f.paiement, f.periode], load);
watch(() => f.q, () => { clearTimeout(timer); timer = setTimeout(load, 300); });
</script>
<template>
  <h1 style="font-size:1.6rem">Réservations</h1>
  <div class="card filters">
    <div class="field"><label for="f-q">Rechercher</label><input id="f-q" type="search" v-model="f.q" placeholder="Nom, téléphone, service" /></div>
    <div class="row two">
      <div class="field"><label for="f-p">Période</label><select id="f-p" v-model="f.periode"><option value="all">Toutes</option><option value="today">Aujourd'hui</option><option value="upcoming">À venir</option><option value="past">Passées</option></select></div>
      <div class="field"><label for="f-s">Statut</label><select id="f-s" v-model="f.statut"><option value="">Tous</option><option v-for="(l, k) in STATUT" :key="k" :value="k">{{ l }}</option></select></div>
    </div>
    <div class="field" style="margin:0"><label for="f-pa">Paiement</label><select id="f-pa" v-model="f.paiement"><option value="">Tous</option><option v-for="(l, k) in PAIEMENT" :key="k" :value="k">{{ l }}</option></select></div>
  </div>
  <p v-if="error" class="err">{{ error }}</p>
  <div class="stack" style="margin-top:1rem">
    <p v-if="!loading && !list.length" class="muted">Aucune réservation ne correspond.</p>
    <ReservationRow v-for="r in list" :key="r.id" :r="r" @click="openId = r.id" />
  </div>
  <ReservationSheet v-if="openId" :id="openId" @close="openId = null" />
</template>
