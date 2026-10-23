<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ImagePlus, Trash2 } from 'lucide-vue-next';

// Choix d'une image avec aperçu. Émet `pick` (File) ou `clear`. L'envoi est géré par le parent.
const props = defineProps({ label: String, current: String, pending: Object, removed: Boolean, hint: String });
const emit = defineEmits(['pick', 'clear']);
const preview = ref(null);
watch(() => props.pending, (f) => {
  if (preview.value) URL.revokeObjectURL(preview.value);
  preview.value = f ? URL.createObjectURL(f) : null;
}, { immediate: true });
onBeforeUnmount(() => preview.value && URL.revokeObjectURL(preview.value));
const shown = computed(() => preview.value || (props.removed ? null : props.current));
const input = ref(null);
function onChange(e) { const f = e.target.files[0]; if (f) emit('pick', f); e.target.value = ''; }
</script>

<template>
  <div class="imgf">
    <span class="lab">{{ label }}</span>
    <div class="box">
      <img v-if="shown" :src="shown" alt="Aperçu" />
      <span v-else class="empty"><ImagePlus :size="26" />Aucune image</span>
    </div>
    <div class="acts">
      <button type="button" class="btn ghost sm" @click="input.click()"><ImagePlus :size="16" /> {{ shown ? 'Remplacer' : 'Choisir une image' }}</button>
      <button v-if="shown" type="button" class="btn danger sm" @click="emit('clear')"><Trash2 :size="16" /> Retirer</button>
    </div>
    <input ref="input" type="file" accept="image/*" hidden @change="onChange" />
    <small v-if="hint" class="muted">{{ hint }}</small>
  </div>
</template>

<style scoped>
.imgf { display: grid; gap: .5rem; margin-bottom: 1rem; } .lab { font-weight: 600; font-size: .9rem; }
.box { aspect-ratio: 4 / 3; border: 1.5px dashed var(--line); border-radius: 14px; background: #fff; overflow: hidden; display: grid; place-items: center; }
.box img { width: 100%; height: 100%; object-fit: cover; } .empty { display: grid; justify-items: center; gap: .3rem; color: var(--muted); font-size: .85rem; }
.acts { display: flex; gap: .5rem; flex-wrap: wrap; }
</style>
