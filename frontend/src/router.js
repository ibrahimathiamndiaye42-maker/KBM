import { createRouter, createWebHistory } from 'vue-router';
import { auth, loadSession } from './composables/useAuth.js';

const routes = [
  { path: '/', component: () => import('./pages/public/Home.vue') },
  { path: '/admin/login', component: () => import('./pages/admin/Login.vue') },
  {
    path: '/admin', component: () => import('./pages/admin/AdminLayout.vue'), meta: { auth: true },
    children: [
      { path: '', component: () => import('./pages/admin/Dashboard.vue') },
      { path: 'reservations', component: () => import('./pages/admin/Reservations.vue') },
      { path: 'clientes', component: () => import('./pages/admin/Clients.vue') },
      { path: 'clientes/:id', component: () => import('./pages/admin/ClientDetail.vue') },
      { path: 'catalogue', component: () => import('./pages/admin/Catalogue.vue'), meta: { owner: true } },
      { path: 'reglages', component: () => import('./pages/admin/Settings.vue'), meta: { owner: true } },
      { path: 'equipe', component: () => import('./pages/admin/Team.vue'), meta: { owner: true } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to) => (to.hash ? { el: to.hash, behavior: 'smooth' } : { top: 0 }),
});

router.beforeEach(async (to) => {
  if (!auth.ready) await loadSession();
  if (to.matched.some((r) => r.meta.auth) && !auth.user) return '/admin/login';
  if (to.matched.some((r) => r.meta.owner) && auth.user?.role !== 'owner') return '/admin';
  if (to.path === '/admin/login' && auth.user) return '/admin';
});

export default router;
