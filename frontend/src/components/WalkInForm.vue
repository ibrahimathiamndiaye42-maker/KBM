<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import Modal from './Modal.vue';
import { api } from '../api/http.js';
import { bump } from '../composables/adminBus.js';
import { MOYENS, money, today } from '../composables/format.js';

const emit = defineEmits(['close', 'saved']);
const catalog = reactive({ services: [], packs: [] });
const f = reactive({ nom: '', telephone: '', item: '', date: today(), montant: '', moyen: 'ESPECES', paye: true, notes: '' });
const error = ref(''); const busy = ref(false);

onMounted(async () => {
  const [s, p] = await Promise.all([api('/admin/services'), api('/admin/packs')]);
  catalog.services = s.items.filter((x) => x.actif); catalog.packs = p.items.filter((x) => x.actif);
});
const price = computed(() => {
  if (!f.item) return null; const [t, id] = f.item.split(':');
  return (t === 'service' ? catalog.services : catalog.packs).find((x) => x.id === Number(id))?.prix ?? null;
});

async function save() {
  error.value = '';
  if (!f.item) { error.value = 'Choisissez un service ou un pack.'; return; }
  const [t, id] = f.item.split(':'); busy.value = true;
  try {
    const { reservation } = await api('/admin/walk-ins', { method: 'POST', body: {
      nom: f.nom, telephone: f.telephone, date: f.date, paye: f.paye, notes: f.notes || undefined,
      [t === 'service' ? 'service_id' : 'pack_id']: Number(id),
      montant: f.montant === '' ? undefined : Number(f.montant), moyen: f.paye ? f.moyen : undefined } });
    bump(); emit('saved', reservation); emit('close');
  } catch (e) { error.value = e.message; } finally { busy.value = false; }
}
</script>

<template>
  <Modal title="Nouvelle cliente" @close="emit('close')">
    <form novalidate @submit.prevent="save">
      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <div class="field"><label for="w-nom">Nom</label><input id="w-nom" v-model="f.nom" required autocomplete="off" /></div>
      <div class="field"><label for="w-tel">Téléphone</label><input id="w-tel" v-model="f.telephone" type="tel" inputmode="tel" required /></div>
      <div class="field"><label for="w-item">Service ou pack</label>
        <select id="w-item" v-model="f.item"><option value="" disabled>Choisir</option>
          <optgroup label="Services"><option v-for="s in catalog.services" :key="'s'+s.id" :value="`service:${s.id}`">{{ s.nom }} — {{ money(s.prix) }}</option></optgroup>
          <optgroup label="Packs"><option v-for="p in catalog.packs" :key="'p'+p.id" :value="`pack:${p.id}`">{{ p.nom }} — {{ money(p.prix) }}</option></optgroup>
        </select></div>
      <div class="row two">
        <div class="field"><label for="w-date">Date</label><input id="w-date" type="date" v-model="f.date" /></div>
        <div class="field"><label for="w-m">Montant (F CFA)</label><input id="w-m" type="number" min="0" inputmode="numeric" v-model="f.montant" :placeholder="price != null ? String(price) : ''" /></div>
      </div>
      <div class="field"><label><input type="checkbox" v-model="f.paye" style="min-height:auto;width:auto" /> Paiement reçu</label></div>
      <div class="field" v-if="f.paye"><label for="w-moyen">Moyen de paiement</label>
        <select id="w-moyen" v-model="f.moyen"><option v-for="(l, k) in MOYENS" :key="k" :value="k">{{ l }}</option></select></div>
      <div class="field"><label for="w-notes">Notes</label><textarea id="w-notes" v-model="f.notes"></textarea></div>
      <button class="btn gold block" :disabled="busy">{{ busy ? 'Enregistrement…' : 'Enregistrer la cliente' }}</button>
    </form>
  </Modal>
</template>
