import { reactive } from 'vue';
// Incrémenté après chaque modification pour que les listes se rechargent
export const bus = reactive({ tick: 0, walkIn: false });
export const bump = () => { bus.tick++; };
