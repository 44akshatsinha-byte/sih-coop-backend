/**
 * Fetch wrapper. JWT from localStorage. 401 → login.
 * Response shapes match live API: { success, data, user, series, alerts, reviewFlag }.
 */

const TOKEN_KEY = "coop_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const baseUrl = () => (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  if (res.status === 401) {
    setToken(null);
    if (onUnauthorized) onUnauthorized();
    const err = new Error(json.message || "Unauthorized");
    err.status = 401;
    err.payload = json;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(json.message || "Request failed");
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json;
}

export const authApi = {
  register: (body) => api("/api/auth/register", { method: "POST", body, auth: false }),
  login: (body) => api("/api/auth/login", { method: "POST", body, auth: false }),
  me: () => api("/api/auth/me"),
  patchMe: (body) => api("/api/auth/me", { method: "PATCH", body })
};

export const gigsApi = {
  create: (body) => api("/api/gigs", { method: "POST", body }),
  list: (qs = "") => api(`/api/gigs${qs}`),
  mine: () => api("/api/gigs/my-gigs"),
  get: (id) => api(`/api/gigs/${id}`),
  assign: (id, workerId) => api(`/api/gigs/${id}/assign`, { method: "PUT", body: { workerId } }),
  start: (id) => api(`/api/gigs/${id}/start`, { method: "PUT" }),
  complete: (id) => api(`/api/gigs/${id}/complete`, { method: "PUT" }),
  review: (id, body) => api(`/api/gigs/${id}/review`, { method: "POST", body })
};

export const matchApi = {
  rank: (body) => api("/api/match-worker", { method: "POST", body })
};

export const paymentsApi = {
  config: () => api("/api/payments/config", { auth: false }),
  createOrder: (body) => api("/api/payments/create-order", { method: "POST", body }),
  verify: (body) => api("/api/payments/verify", { method: "POST", body })
};

export const adminApi = {
  forecast: (days = 7) => api(`/api/admin/forecast?days=${days}`),
  queue: () => api("/api/admin/verification-queue"),
  verify: (id, body) => api(`/api/admin/workers/${id}/verify`, { method: "PUT", body }),
  flags: () => api("/api/admin/flagged-reviews"),
  flagAction: (gigId, action) =>
    api(`/api/admin/flagged-reviews/${gigId}`, { method: "PUT", body: { action } })
};

export const CATEGORIES = [
  "electrical",
  "plumbing",
  "carpentry",
  "painting",
  "cleaning",
  "driving",
  "gardening",
  "caregiving",
  "technician",
  "domestic",
  "general"
];
