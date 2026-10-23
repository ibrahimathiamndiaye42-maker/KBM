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
      { path: 'compte', component: () => import('./pages/admin/Account.vue') },
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

// Sur /admin, l'application installée est « KMB Gestion » et s'ouvre directement sur l'espace équipe.
// Ailleurs, c'est l'application publique. Le navigateur lit le manifeste au moment de l'installation.
router.afterEach((to) => {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return;
  const admin = to.path.startsWith('/admin');
  if (!link.dataset.public) link.dataset.public = link.getAttribute('href');
  link.setAttribute('href', admin ? '/manifest-admin.webmanifest' : link.dataset.public);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', admin ? '#1A110F' : '#56372F');
});

export default router;
