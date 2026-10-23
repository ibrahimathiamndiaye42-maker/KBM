<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '../../api/http.js';
import ImageField from '../../components/ImageField.vue';
import Modal from '../../components/Modal.vue';
import { compressImage, money } from '../../composables/format.js';
import { loadSite } from '../../composables/useConfig.js';

const tab = ref('services');
const items = ref([]); const error = ref(''); const form = ref(null); const busy = ref(false);
const label = () => (tab.value === 'services' ? 'service' : 'pack');

async function load() { try { items.value = (await api(`/admin/${tab.value}`)).items; } catch (e) { error.value = e.message; } }
onMounted(load);
const switchTab = (t) => { tab.value = t; load(); };
const blank = () => ({ id: null, nom: '', description: '', prix: 0, ordre: items.value.length, actif: true, image: null });
const pending = ref(null); const removed = ref(false);
const open = (item) => { pending.value = null; removed.value = false; form.value = item; };

async function save() {
  error.value = ''; busy.value = true;
  const { id, image, ...body } = form.value; body.prix = Number(body.prix); body.ordre = Number(body.ordre);
  try {
    const saved = (await api(`/admin/${tab.value}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body })).item;
    const key = `${label()}-${saved.id}`;
    if (pending.value) await api(`/admin/media/${key}`, { method: 'PUT', body: await compressImage(pending.value, 1200) });
    else if (removed.value) await api(`/admin/media/${key}`, { method: 'DELETE' });
    form.value = null; await load(); loadSite();
  } catch (e) { error.value = e.message; } finally { busy.value = false; }
}
</script>
<template>
  <h1 style="font-size:1.6rem">Tarifs</h1>
  <div class="tabs" role="tablist">
    <button role="tab" :aria-selected="tab === 'services'" :class="{ on: tab === 'services' }" @click="switchTab('services')">Services</button>
    <button role="tab" :aria-selected="tab === 'packs'" :class="{ on: tab === 'packs' }" @click="switchTab('packs')">Packs</button>
  </div>
  <p v-if="error && !form" class="err">{{ error }}</p>
  <button class="btn gold block" style="margin:1rem 0" @click="open(blank())">Ajouter un {{ label() }}</button>
  <div class="stack">
    <button v-for="i in items" :key="i.id" class="card it" :class="{ off: !i.actif }" @click="open({ ...i })">
      <img v-if="i.image" :src="i.image" alt="" class="th" /><span v-else class="th ph"></span>
      <div class="grow"><strong>{{ i.nom }}</strong><span v-if="!i.actif" class="badge ANNULEE">Masqué</span><br /><span class="muted small">{{ i.description || 'Aucune description' }}</span></div>
      <b>{{ money(i.prix) }}</b>
    </button>
  </div>
  <Modal v-if="form" :title="form.id ? `Modifier le ${label()}` : `Nouveau ${label()}`" @close="form = null">
    <form novalidate @submit.prevent="save">
      <p v-if="error" class="err">{{ error }}</p>
      <ImageField :label="`Image du ${label()}`" :current="form.image" :pending="pending" :removed="removed"
        hint="Format paysage conseillé. Sans image, un visuel élégant est affiché automatiquement."
        @pick="(f) => { pending = f; removed = false; }" @clear="pending = null; removed = true" />
      <div class="field"><label for="k-n">Nom</label><input id="k-n" v-model="form.nom" required /></div>
      <div class="field"><label for="k-p">Prix (F CFA)</label><input id="k-p" type="number" min="0" inputmode="numeric" v-model="form.prix" /></div>
      <div class="field"><label for="k-d">Description</label><textarea id="k-d" v-model="form.description"></textarea>
        <small v-if="tab === 'packs'">Composition du pack : à renseigner ici par l'institut.</small></div>
      <div class="field"><label for="k-o">Ordre d'affichage</label><input id="k-o" type="number" v-model="form.ordre" /></div>
      <div class="field"><label><input type="checkbox" v-model="form.actif" style="min-height:auto;width:auto" /> Visible sur le site et réservable</label></div>
      <button class="btn block" :disabled="busy">Enregistrer</button>
    </form>
  </Modal>
</template>
<style scoped>
.tabs { display: flex; gap: .5rem; } .tabs button { flex: 1; min-height: 46px; border: 1.5px solid var(--line); border-radius: 999px; background: #fff; font: 600 .95rem var(--sans); cursor: pointer; }
.tabs button.on { background: var(--choco); color: #fff; border-color: var(--choco); }
.it { display: flex; justify-content: space-between; gap: 1rem; text-align: left; font: inherit; cursor: pointer; width: 100%; align-items: center; } .it.off { opacity: .6; } .it { gap: .85rem; } .grow { flex: 1; min-width: 0; }
.th { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; flex-shrink: 0; } .th.ph { background: var(--choco); }
.it b { font-family: var(--serif); white-space: nowrap; }
</style>
