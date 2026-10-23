<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { ChevronLeft, ChevronRight, X } from 'lucide-vue-next';

const props = defineProps({ items: Array, index: Number });
const emit = defineEmits(['close', 'change']);
const item = computed(() => props.items[props.index]);
const go = (d) => emit('change', (props.index + d + props.items.length) % props.items.length);
const onKey = (e) => { if (e.key === 'Escape') emit('close'); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
onMounted(() => { window.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden'; });
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; });
</script>

<template>
  <div class="lb" role="dialog" aria-modal="true" aria-label="Photo agrandie" @click.self="emit('close')">
    <button class="x" aria-label="Fermer" @click="emit('close')"><X :size="26" /></button>
    <button v-if="items.length > 1" class="nav l" aria-label="Photo précédente" @click="go(-1)"><ChevronLeft :size="30" /></button>
    <figure>
      <img :src="`/api/public/gallery/${item.id}/image`" :alt="item.legende || 'Photo de l\'institut'" />
      <figcaption v-if="item.legende">{{ item.legende }}</figcaption>
    </figure>
    <button v-if="items.length > 1" class="nav r" aria-label="Photo suivante" @click="go(1)"><ChevronRight :size="30" /></button>
  </div>
</template>

<style scoped>
.lb { position: fixed; inset: 0; z-index: 100; background: rgba(15, 9, 7, .94); display: grid; place-items: center; padding: 3.5rem 1rem 2rem; }
figure { margin: 0; max-width: min(1100px, 100%); max-height: 100%; display: grid; gap: .75rem; justify-items: center; }
figure img { max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 8px; }
figcaption { color: #E8DCC3; font-size: .95rem; text-align: center; }
button { position: absolute; width: 48px; height: 48px; border: 0; border-radius: 50%; background: rgba(255,255,255,.12); color: #fff; display: grid; place-items: center; cursor: pointer; }
button:hover { background: rgba(255,255,255,.22); }
.x { top: .75rem; right: .75rem; } .nav { top: 50%; transform: translateY(-50%); } .l { left: .5rem; } .r { right: .5rem; }
</style>
