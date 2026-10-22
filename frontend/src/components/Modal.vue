<script setup>
import { X } from 'lucide-vue-next';
defineProps({ title: String });
defineEmits(['close']);
</script>
<template>
  <div class="sheet-back" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <div class="sheet" role="dialog" aria-modal="true" :aria-label="title">
      <div class="sheet-head">
        <h2>{{ title }}</h2>
        <button class="icon-btn" aria-label="Fermer" @click="$emit('close')"><X :size="22" /></button>
      </div>
      <slot />
    </div>
  </div>
</template>
