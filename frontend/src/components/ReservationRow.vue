<script setup>
import { fdate, money, STATUT, PAIEMENT } from '../composables/format.js';
defineProps({ r: Object, showDate: { type: Boolean, default: true } });
</script>
<template>
  <button class="rrow card" type="button">
    <div class="l">
      <strong>{{ r.client_nom }}</strong>
      <span class="muted small">{{ r.item_label }}</span>
      <span class="muted small">{{ showDate ? fdate(r.date) + ' · ' : '' }}{{ r.heure }} · {{ money(r.montant) }}</span>
    </div>
    <div class="rt">
      <span class="badge" :class="r.statut">{{ STATUT[r.statut] }}</span>
      <span class="badge" :class="r.paiement_statut">{{ PAIEMENT[r.paiement_statut] }}</span>
    </div>
  </button>
</template>
<style scoped>
.rrow { display: flex; justify-content: space-between; gap: .75rem; width: 100%; text-align: left; cursor: pointer; font: inherit; color: inherit; align-items: center; min-height: 64px; }
.l { display: grid; gap: .1rem; } .rt { display: grid; gap: .3rem; justify-items: end; flex-shrink: 0; }
</style>
