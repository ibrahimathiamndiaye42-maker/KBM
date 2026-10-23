<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { CheckCircle2 } from 'lucide-vue-next';
import { api } from '../api/http.js';
import { booking, site, waLink } from '../composables/useConfig.js';
import { fdate, money, today } from '../composables/format.js';

const form = reactive({ item: '', date: '', heure: '', nom: '', telephone: '', email: '' });
const slots = ref([]); const slotsLoading = ref(false);
const error = ref(''); const sending = ref(false); const done = ref(null);

const selected = computed(() => {
  if (!form.item) return null;
  const [type, id] = form.item.split(':');
  const list = type === 'service' ? site.services : site.packs;
  return list.find((x) => x.id === Number(id));
});

watch(() => booking.item, (v) => { if (v) form.item = v; }, { immediate: true });

watch(() => form.date, async (d) => {
  form.heure = ''; slots.value = [];
  if (!d) return;
  slotsLoading.value = true;
  try { slots.value = (await api(`/public/slots?date=${d}`)).slots; }
  catch (e) { error.value = e.message; }
  finally { slotsLoading.value = false; }
});

async function submit() {
  error.value = '';
  if (!form.item || !form.date || !form.heure) { error.value = 'Choisissez une prestation, une date et une heure.'; return; }
  const [type, id] = form.item.split(':');
  sending.value = true;
  try {
    const r = await api('/public/reservations', { method: 'POST', body: {
      [type === 'service' ? 'service_id' : 'pack_id']: Number(id),
      date: form.date, heure: form.heure, nom: form.nom, telephone: form.telephone, email: form.email,
    } });
    done.value = r.reservation;
  } catch (e) {
    error.value = e.message;
    if (e.status === 409 && form.date) { const d = form.date; form.date = ''; form.date = d; }
  } finally { sending.value = false; }
}

const wa = computed(() => done.value && waLink(
  `Bonjour, je viens d'envoyer une demande de réservation : ${done.value.item_label} le ${fdate(done.value.date)} à ${done.value.heure}. Nom : ${form.nom}.`));
</script>

<template>
  <div v-if="done" class="card done" role="status">
    <CheckCircle2 :size="40" color="var(--ok)" />
    <h3>Votre demande est bien reçue</h3>
    <span class="badge EN_ATTENTE">En attente de confirmation</span>
    <p><strong>{{ done.item_label }}</strong><br />{{ fdate(done.date) }} à {{ done.heure }} — {{ money(done.montant) }}</p>
    <ol class="next">
      <li>L'institut va vous <strong>appeler au {{ form.telephone }}</strong> pour vérifier vos informations et vous indiquer comment payer.</li>
      <li>Une fois le paiement vérifié, votre réservation est <strong>validée définitivement</strong>.</li>
      <li>Vous recevez alors votre <strong>reçu en PDF</strong> comme confirmation.</li>
    </ol>
    <p class="muted small">Ceci n'est pas encore une réservation confirmée. Gardez votre téléphone à portée de main.</p>
    <a v-if="wa" class="btn ghost sm" :href="wa" target="_blank" rel="noopener">Écrire à l'institut sur WhatsApp</a>
  </div>

  <form v-else class="card" novalidate @submit.prevent="submit">
    <p v-if="error" class="err" role="alert">{{ error }}</p>

    <div class="field">
      <label for="b-item">Prestation</label>
      <select id="b-item" v-model="form.item" required>
        <option value="" disabled>Choisir un service ou un pack</option>
        <optgroup label="Services">
          <option v-for="s in site.services" :key="'s'+s.id" :value="`service:${s.id}`">{{ s.nom }} — {{ money(s.prix) }}</option>
        </optgroup>
        <optgroup label="Packs">
          <option v-for="p in site.packs" :key="'p'+p.id" :value="`pack:${p.id}`">{{ p.nom }} — {{ money(p.prix) }}</option>
        </optgroup>
      </select>
      <small v-if="selected?.description">{{ selected.description }}</small>
    </div>

    <div class="field">
      <label for="b-date">Date</label>
      <input id="b-date" type="date" v-model="form.date" :min="today()" required />
    </div>

    <div v-if="form.date" class="field">
      <label id="b-heure">Heure</label>
      <p v-if="slotsLoading" class="muted small">Chargement des créneaux…</p>
      <p v-else-if="!slots.length" class="muted small">Aucun créneau ce jour-là.</p>
      <div v-else class="slots" role="radiogroup" aria-labelledby="b-heure">
        <button v-for="s in slots" :key="s.heure" type="button" role="radio" :aria-checked="form.heure === s.heure"
          :class="{ on: form.heure === s.heure }" :disabled="!s.disponible" @click="form.heure = s.heure">{{ s.heure }}</button>
      </div>
    </div>

    <div class="row two">
      <div class="field"><label for="b-nom">Votre nom</label><input id="b-nom" v-model="form.nom" autocomplete="name" required /></div>
      <div class="field"><label for="b-tel">Téléphone</label><input id="b-tel" v-model="form.telephone" type="tel" autocomplete="tel" inputmode="tel" required /></div>
    </div>
    <div class="field"><label for="b-mail">E-mail <span class="muted">(facultatif)</span></label><input id="b-mail" v-model="form.email" type="email" autocomplete="email" /></div>

    <button class="btn gold block" :disabled="sending">{{ sending ? 'Envoi…' : 'Envoyer ma demande de réservation' }}</button>
    <p class="muted small" style="text-align:center;margin:.75rem 0 0">Aucun paiement n'est demandé maintenant : l'institut vous appellera.</p>
  </form>
</template>

<style scoped>
.slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: .5rem; }
.slots button { min-height: 46px; border: 1.5px solid var(--line); border-radius: 12px; background: #fff; font: 600 .95rem var(--sans); cursor: pointer; color: var(--ink); }
.slots button.on { background: var(--choco); border-color: var(--choco); color: #fff; }
.slots button:disabled { opacity: .4; text-decoration: line-through; cursor: not-allowed; }
.next { text-align: left; margin: .25rem 0; padding-left: 1.2rem; display: grid; gap: .4rem; font-size: .95rem; }
.done { text-align: center; display: grid; gap: .5rem; justify-items: center; padding: 1.75rem 1.25rem; }
</style>
