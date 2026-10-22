import { reactive } from 'vue';
import { api } from '../api/http.js';

export const auth = reactive({ user: null, ready: false });

export async function loadSession() {
  try { auth.user = (await api('/auth/me')).user; } catch { auth.user = null; }
  auth.ready = true;
}
export async function login(email, password) {
  auth.user = (await api('/auth/login', { method: 'POST', body: { email, password } })).user;
}
export async function logout() {
  await api('/auth/logout', { method: 'POST' }).catch(() => {});
  auth.user = null;
}
