export class ApiError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'kmb', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Connexion impossible. Vérifiez votre réseau.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.details?.[0]?.message;
    throw new ApiError(res.status, detail ? `${data.error} ${detail}` : data.error || 'Une erreur est survenue.', data.details);
  }
  return data;
}

export async function fetchBlob(path) {
  const res = await fetch(`/api${path}`, { credentials: 'same-origin', headers: { 'X-Requested-With': 'kmb' } });
  if (!res.ok) throw new ApiError(res.status, 'Impossible de charger le document.');
  return res.blob();
}
