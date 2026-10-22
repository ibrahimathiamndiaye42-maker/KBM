<script setup>
import { onMounted, ref, watch } from 'vue';
import { api } from '../../api/http.js';
import { bus } from '../../composables/adminBus.js';
import { fdate } from '../../composables/format.js';

const q = ref(''); const list = ref([]); const error = ref(''); let timer;
async function load() {
  try { list.value = (await api(`/admin/clients${q.value ? `?q=${encodeURIComponent(q.value)}` : ''}`)).clients; }
  catch (e) { error.value = e.message; }
}
onMounted(load); watch(() => bus.tick, load);
watch(q, () => { clearTimeout(timer); timer = setTimeout(load, 300); });
</script>
<template>
  <h1 style="font-size:1.6rem">Clientes</h1>
  <div class="field"><label for="c-q">Rechercher une cliente</label><input id="c-q" type="search" v-model="q" placeholder="Nom ou téléphone" /></div>
  <p v-if="error" class="err">{{ error }}</p>
  <div class="stack">
    <p v-if="!list.length" class="muted">Aucune cliente trouvée.</p>
    <RouterLink v-for="c in list" :key="c.id" :to="`/admin/clientes/${c.id}`" class="card item">
      <div><strong>{{ c.nom }}</strong><br /><span class="muted small">+{{ c.telephone }}</span></div>
      <div class="muted small" style="text-align:right">{{ c.nb_visites }} visite{{ c.nb_visites > 1 ? 's' : '' }}<br />{{ c.derniere_visite ? `Dernière : ${fdate(c.derniere_visite)}` : '' }}</div>
    </RouterLink>
  </div>
</template>
<style scoped>.item { display: flex; justify-content: space-between; gap: 1rem; text-decoration: none; min-height: 64px; align-items: center; }</style>
