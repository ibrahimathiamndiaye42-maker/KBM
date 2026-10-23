<script setup>
import { computed } from 'vue';
import { Baby, Droplets, Feather, Flame, Flower2, Gift, Hand, Leaf, Sparkles } from 'lucide-vue-next';

// Image réelle si la propriétaire en a ajouté une ; sinon un visuel de repli élégant selon le type de soin.
const props = defineProps({ name: String, image: String });

const RULES = [
  [/accouch|naissance|maman/, Baby], [/damp|hamam|bain/, Droplets], [/gommage/, Sparkles], [/pedicure|manucure|ongle/, Hand],
  [/visage|soin/, Flower2], [/cire|epil/, Feather], [/ventouse/, Flame], [/massage|relax/, Leaf], [/pack/, Gift],
];
const icon = computed(() => {
  const n = (props.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return RULES.find(([re]) => re.test(n))?.[1] ?? Sparkles;
});
</script>

<template>
  <div class="visual">
    <img v-if="image" :src="image" :alt="name" loading="lazy" />
    <div v-else class="fallback" aria-hidden="true">
      <span class="ring"><component :is="icon" :size="34" :stroke-width="1.5" /></span>
    </div>
  </div>
</template>

<style scoped>
.visual { position: relative; overflow: hidden; background: var(--choco); aspect-ratio: 4 / 3; }
.visual img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.fallback { height: 100%; display: grid; place-items: center; color: var(--gold);
  background: radial-gradient(90% 90% at 80% 10%, #7a5043 0%, var(--choco) 55%, var(--black) 100%); }
.ring { width: 76px; height: 76px; border: 1.5px solid var(--gold); border-radius: 50%; display: grid; place-items: center; }
</style>
