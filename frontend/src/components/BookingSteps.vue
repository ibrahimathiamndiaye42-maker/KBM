<script setup>
import { ShieldCheck } from 'lucide-vue-next';
import { site } from '../composables/useConfig.js';

const steps = [
  ['Vous remplissez le formulaire', 'Choisissez votre soin, la date et l\'heure, puis envoyez votre demande.'],
  ['L\'institut reçoit votre demande', 'Toutes les informations lui sont transmises aussitôt.'],
  ['L\'institut vous appelle', 'Pour vérifier vos informations et vous indiquer comment effectuer le paiement.'],
  ['Vous effectuez le paiement', 'En dehors du site, selon le moyen de paiement indiqué par l\'institut.'],
  ['L\'institut valide votre réservation', 'Après avoir vérifié la réception de votre paiement.'],
  ['Vous recevez votre reçu en PDF', 'C\'est votre confirmation définitive de réservation.'],
];
</script>

<template>
  <aside class="steps" aria-labelledby="steps-title">
    <h3 id="steps-title">Comment ça marche ?</h3>
    <ol>
      <li v-for="([t, d], i) in steps" :key="i">
        <span class="n" aria-hidden="true">{{ i + 1 }}</span>
        <div>
          <strong>{{ t }}</strong>
          <p>{{ d }}</p>
          <p v-if="i === 3 && site.settings.payment_methods" class="pm">Moyens acceptés : {{ site.settings.payment_methods }}</p>
        </div>
      </li>
    </ol>
    <p class="note"><ShieldCheck :size="20" />
      <span><strong>Bon à savoir :</strong> votre demande n'est pas encore une réservation confirmée. Elle le devient uniquement lorsque l'institut a vérifié votre paiement. Aucun paiement n'est demandé sur ce site.</span></p>
  </aside>
</template>

<style scoped>
.steps h3 { font-size: 1.3rem; margin-bottom: 1rem; }
ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 0; position: relative; }
li { display: flex; gap: .9rem; padding-bottom: 1.1rem; position: relative; }
li:not(:last-child)::before { content: ''; position: absolute; left: 15px; top: 34px; bottom: 2px; width: 2px; background: var(--line); }
.n { flex: 0 0 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: var(--choco); color: #fff; font: 700 .9rem var(--serif); }
li:last-child .n { background: var(--gold); color: var(--black); }
li strong { display: block; line-height: 1.3; margin-top: .3rem; } li p { margin: .15rem 0 0; font-size: .92rem; color: var(--muted); }
.pm { color: var(--choco) !important; font-weight: 600; }
.note { display: flex; gap: .7rem; align-items: flex-start; margin: .5rem 0 0; padding: .9rem 1rem; border-radius: 14px; background: #E8F1F7; border-left: 4px solid var(--sky); font-size: .92rem; color: var(--ink); }
.note svg { flex-shrink: 0; color: #2C5D82; margin-top: .1rem; }
</style>
