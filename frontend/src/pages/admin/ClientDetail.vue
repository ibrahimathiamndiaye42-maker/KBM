<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Download, Eye, Share2 } from 'lucide-vue-next';
import ReservationRow from '../../components/ReservationRow.vue';
import ReservationSheet from '../../components/ReservationSheet.vue';
import { api } from '../../api/http.js';
import { bus } from '../../composables/adminBus.js';
import { fdate, money } from '../../composables/format.js';
import { downloadReceipt, shareReceipt, viewReceipt } from '../../composables/receipt.js';

const route = useRoute();
const d = ref(null); const error = ref(''); const openId = ref(null);
async function load() { try { d.value = await api(`/admin/clients/${route.params.id}`); } catch (e) { error.value = e.message; } }
onMounted(load); watch(() => bus.tick, load);
const guard = (fn) => async () => { try { await fn(); } catch (e) { error.value = e.message; } };
</script>
<template>
  <RouterLink to="/admin/clientes" class="small">← Clientes</RouterLink>
  <p v-if="error" class="err">{{ error }}</p>
  <template v-if="d">
    <h1 style="font-size:1.6rem;margin-top:.5rem">{{ d.client.nom }}</h1>
    <p class="muted"><a :href="`tel:+${d.client.telephone}`">+{{ d.client.telephone }}</a> · cliente depuis le {{ fdate(d.client.created_at) }}<span v-if="d.client.email"> · {{ d.client.email }}</span></p>

    <h2 class="h">Historique des prestations et réservations</h2>
    <div class="stack"><p v-if="!d.reservations.length" class="muted">Aucun historique.</p>
      <ReservationRow v-for="r in d.reservations" :key="r.id" :r="r" @click="openId = r.id" /></div>

    <h2 class="h">Reçus générés</h2>
    <div class="stack"><p v-if="!d.receipts.length" class="muted">Aucun reçu.</p>
      <div v-for="r in d.receipts" :key="r.id" class="card rc">
        <div><strong>{{ r.numero }}</strong><br /><span class="muted small">{{ r.item_label }} — {{ money(r.montant) }} — {{ fdate(r.date) }}</span></div>
        <div class="acts">
          <button class="icon-btn" aria-label="Voir" @click="guard(() => viewReceipt(r.id))()"><Eye :size="20" /></button>
          <button class="icon-btn" aria-label="Télécharger" @click="guard(() => downloadReceipt(r.id, r.numero))()"><Download :size="20" /></button>
          <button class="icon-btn" aria-label="Partager" @click="guard(() => shareReceipt(r.id, r.numero))()"><Share2 :size="20" /></button>
        </div>
      </div></div>
  </template>
  <ReservationSheet v-if="openId" :id="openId" @close="openId = null" />
</template>
<style scoped>.h { font-size: 1.2rem; margin: 1.5rem 0 .6rem; } .rc { display: flex; justify-content: space-between; align-items: center; gap: .5rem; } .acts { display: flex; }</style>
