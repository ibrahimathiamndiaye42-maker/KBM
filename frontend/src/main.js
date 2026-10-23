import { createApp } from 'vue';
import App from './App.vue';
import router from './router.js';
import { loadSite } from './composables/useConfig.js';
import './composables/usePwaInstall.js';
import './styles/main.css';

loadSite().catch(() => {});
createApp(App).use(router).mount('#app');
