<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { BellRing, Download, Eye, MessageCircle, Phone, Printer, Send } from 'lucide-vue-next';
import Modal from './Modal.vue';
import { api } from '../api/http.js';
import { bump } from '../composables/adminBus.js';
import { fdate, money, MOYENS, PAIEMENT, STATUT } from '../composables/format.js';
import { downloadReceipt, printReceipt, shareReceipt, viewReceipt } from '../composables/receipt.js';

const props = defineProps({ id: Number });
const emit = defineEmits(['close']);

const r = ref(null); const error = ref(''); const busy = ref(false); const editing = ref(false);
const pay = reactive({ moyen: 'ESPECES', montant: 0 });
const edit = reactive({ date: '', heure: '', item: '', montant: 0, notes: '' });
const catalog = reactive({ services: [], packs: [] });

async function load() {
  r.value = (await api(`/admin/reservations/${props.id}`)).reservation;
  pay.moyen = r.value.paiement_moyen || 'ESPECES'; pay.montant = r.value.paiement_montant ?? r.value.montant;
  Object.assign(edit, { date: r.value.date, heure: r.value.heure, montant: r.value.montant, notes: r.value.notes || '',
    item: r.value.service_id ? `service:${r.value.service_id}` : `pack:${r.value.pack_id}` });
}
onMounted(async () => {
  try {
    await load();
    const [s, p] = await Promise.all([api('/admin/services'), api('/admin/packs')]);
    catalog.services = s.items.filter((x) => x.actif); catalog.packs = p.items.filter((x) => x.actif);
  } catch (e) { error.value = e.message; }
});

async function run(fn) {
  error.value = ''; busy.value = true;
  try { await fn(); await load(); bump(); } catch (e) { error.value = e.message; } finally { busy.value = false; }
}
const setStatus = (statut) => run(() => api(`/admin/reservations/${props.id}`, { method: 'PATCH', body: { statut } }));
const setPayment = (statut) => run(() => api(`/admin/reservations/${props.id}/payment`, { method: 'PUT',
  body: { statut, moyen: statut === 'CONFIRME' ? pay.moyen : undefined, montant: Number(pay.montant) } }));
const resend = () => run(async () => {
  const r2 = await api(`/admin/reservations/${props.id}/notify`, { method: 'POST' });
  if (r2.statut === 'NON_CONFIGUREE') throw new Error('Les notifications WhatsApp ne sont pas encore activées sur le serveur.');
  if (r2.statut === 'ECHEC') throw new Error(`Envoi impossible : ${r2.erreur}`);
});
const makeReceipt = () => run(() => api(`/admin/reservations/${props.id}/receipt`, { method: 'POST' }));
const saveEdit = () => run(async () => {
  const [type, id] = edit.item.split(':');
  const itemChanged = !(type === 'service' ? r.value.service_id === Number(id) : r.value.pack_id === Number(id));
  await api(`/admin/reservations/${props.id}`, { method: 'PATCH', body: {
    date: edit.date, heure: edit.heure, notes: edit.notes || null, montant: Number(edit.montant),
    ...(itemChanged && !r.value.receipt_id ? { [type === 'service' ? 'service_id' : 'pack_id']: Number(id) } : {}) } });
  editing.value = false;
});
const act = (fn) => async () => { try { await fn(); } catch (e) { error.value = e.message; } };
const canReceipt = computed(() => r.value?.paiement_statut === 'CONFIRME');
</script>

<template>
  <Modal title="Réservation" @close="emit('close')">
    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <p v-if="!r && !error" class="muted">Chargement…</p>
    <div v-if="r" class="stack">
      <div class="card">
        <h3 style="margin:0">{{ r.client_nom }}</h3>
        <p class="muted" style="margin:.1rem 0 .6rem"><a :href="`tel:+${r.client_telephone}`">+{{ r.client_telephone }}</a>
          <RouterLink :to="`/admin/clientes/${r.client_id}`" @click="emit('close')"> · Fiche cliente</RouterLink></p>
        <p style="margin:0"><strong>{{ r.item_label }}</strong><br />{{ fdate(r.date) }} à {{ r.heure }} · {{ money(r.montant) }}</p>
        <p v-if="r.notes" class="muted small">{{ r.notes }}</p>
        <p style="margin:.6rem 0 0"><span class="badge" :class="r.statut">{{ STATUT[r.statut] }}</span>
          <span class="badge" :class="r.paiement_statut"> {{ PAIEMENT[r.paiement_statut] }}</span>
          <span class="badge">{{ r.source === 'SUR_PLACE' ? 'Sur place' : 'En ligne' }}</span></p>
      </div>

      <div v-if="r.statut === 'EN_ATTENTE' && r.paiement_statut !== 'CONFIRME'" class="card todo">
        <strong>À faire : appeler la cliente</strong>
        <p class="muted small" style="margin:.2rem 0 .6rem">Vérifier ses informations et lui indiquer comment payer. La réservation sera confirmée après réception du paiement.</p>
        <div class="row two">
          <a class="btn gold" :href="`tel:+${r.client_telephone}`"><Phone :size="18" /> Appeler</a>
          <a class="btn ghost" :href="`https://wa.me/${r.client_telephone}`" target="_blank" rel="noopener"><MessageCircle :size="18" /> WhatsApp</a>
        </div>
      </div>

      <p v-if="r.source === 'EN_LIGNE'" class="notif small" :class="r.notif_statut">
        <BellRing :size="16" />
        <span v-if="r.notif_statut === 'ENVOYEE'">Notification WhatsApp envoyée à l'institut.</span>
        <span v-else-if="r.notif_statut === 'ECHEC'">Notification WhatsApp non envoyée{{ r.notif_erreur ? ` : ${r.notif_erreur}` : '' }}</span>
        <span v-else>Notification WhatsApp non activée.</span>
        <button v-if="r.notif_statut !== 'ENVOYEE'" type="button" class="link" :disabled="busy" @click="resend">Renvoyer</button>
      </p>

      <div v-if="r.statut !== 'ANNULEE'" class="row two">
        <button v-if="r.statut === 'CONFIRMEE'" class="btn" :disabled="busy" @click="setStatus('TERMINEE')">Marquer terminée</button>
        <button v-if="r.paiement_statut !== 'CONFIRME'" class="btn danger" :disabled="busy" @click="setStatus('ANNULEE')">Annuler la réservation</button>
      </div>

      <div class="card" v-if="r.statut !== 'ANNULEE'">
        <h3 style="font-size:1.1rem">Paiement</h3>
        <template v-if="!r.receipt_id">
          <div class="row two">
            <div class="field"><label for="p-moyen">Moyen de paiement</label>
              <select id="p-moyen" v-model="pay.moyen"><option v-for="(l, k) in MOYENS" :key="k" :value="k">{{ l }}</option></select></div>
            <div class="field"><label for="p-montant">Montant reçu (F CFA)</label>
              <input id="p-montant" type="number" inputmode="numeric" min="0" v-model="pay.montant" /></div>
          </div>
          <div class="row two">
            <button class="btn" :disabled="busy" @click="setPayment('CONFIRME')">Confirmer le paiement</button>
            <button v-if="r.paiement_statut !== 'REFUSE'" class="btn danger" :disabled="busy" @click="setPayment('REFUSE')">Refuser</button>
            <button v-else class="btn ghost" :disabled="busy" @click="setPayment('EN_ATTENTE')">Remettre en attente</button>
          </div>
        </template>
        <p v-else class="muted small">Paiement figé : un reçu a été émis.</p>
      </div>

      <div class="card" v-if="canReceipt">
        <h3 style="font-size:1.1rem">Reçu</h3>
        <button v-if="!r.receipt_id" class="btn gold block" :disabled="busy" @click="makeReceipt">Générer le reçu PDF</button>
        <template v-else>
          <p style="margin:0 0 .6rem"><strong>{{ r.receipt_numero }}</strong></p>
          <div class="acts">
            <button class="btn sm ghost" @click="act(() => viewReceipt(r.receipt_id))()"><Eye :size="16" /> Voir</button>
            <button class="btn sm ghost" @click="act(() => downloadReceipt(r.receipt_id, r.receipt_numero))()"><Download :size="16" /> Télécharger</button>
            <button class="btn sm ghost" @click="act(() => printReceipt(r.receipt_id))()"><Printer :size="16" /> Imprimer</button>
            <button class="btn sm gold" @click="act(() => shareReceipt(r.receipt_id, r.receipt_numero, { nom: r.client_nom, telephone: r.client_telephone }))()"><Send :size="16" /> Envoyer à la cliente</button>
          </div>
        </template>
      </div>

      <div v-if="r.statut !== 'ANNULEE'">
        <button v-if="!editing" class="btn ghost block" @click="editing = true">Modifier la réservation</button>
        <div v-else class="card">
          <div class="row two">
            <div class="field"><label for="e-date">Date</label><input id="e-date" type="date" v-model="edit.date" /></div>
            <div class="field"><label for="e-heure">Heure</label><input id="e-heure" type="time" v-model="edit.heure" /></div>
          </div>
          <div class="field" v-if="!r.receipt_id"><label for="e-item">Prestation</label>
            <select id="e-item" v-model="edit.item">
              <optgroup label="Services"><option v-for="s in catalog.services" :key="'s'+s.id" :value="`service:${s.id}`">{{ s.nom }}</option></optgroup>
              <optgroup label="Packs"><option v-for="p in catalog.packs" :key="'p'+p.id" :value="`pack:${p.id}`">{{ p.nom }}</option></optgroup>
            </select></div>
          <div class="field" v-if="!r.receipt_id"><label for="e-montant">Montant (F CFA)</label><input id="e-montant" type="number" min="0" v-model="edit.montant" /></div>
          <div class="field"><label for="e-notes">Notes</label><textarea id="e-notes" v-model="edit.notes"></textarea></div>
          <div class="row two"><button class="btn" :disabled="busy" @click="saveEdit">Enregistrer</button>
            <button class="btn ghost" @click="editing = false">Annuler</button></div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.acts { display: flex; flex-wrap: wrap; gap: .5rem; }
.todo { border-left: 4px solid var(--gold); }
.notif { display: flex; align-items: center; gap: .4rem; margin: 0; padding: .5rem .75rem; border-radius: 10px; background: #fff; border: 1px solid var(--line); flex-wrap: wrap; }
.notif.ENVOYEE { color: var(--ok); } .notif.ECHEC { color: var(--bad); }
.link { border: 0; background: none; color: var(--choco); text-decoration: underline; font: 600 .85rem var(--sans); cursor: pointer; padding: .4rem; min-height: 36px; }
</style>
