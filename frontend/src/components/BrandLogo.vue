<script setup>
import { site } from '../composables/useConfig.js';
defineProps({ size: { type: Number, default: 40 } });
</script>
<template>
  <img v-if="site.logo" :src="site.logo" :width="size" :height="size" alt="" style="object-fit:contain;border-radius:50%" />
  <svg v-else :width="size" :height="size" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="22" fill="none" stroke="var(--gold)" stroke-width="1.8" />
    <text x="24" y="29.5" text-anchor="middle" font-family="Playfair Display, serif" font-weight="700" font-size="15" fill="var(--gold)">KMB</text>
  </svg>
</template>
