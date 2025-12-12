// src/api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function getToken() {
  return localStorage.getItem('shaheen_admin_token') || '';
}

export async function api(endpoint, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();

  const finalHeaders = { ...headers };
  if (body && !finalHeaders['Content-Type'] && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (token) {
    finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: finalHeaders,
    body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = { raw: await res.text() };
  }

  if (!res.ok) {
    const message = data?.message || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

export async function loginAdmin({ mobile, password }) {
  // Uses existing auth login API
  const data = await api('/api/auth/login', {
    method: 'POST',
    body: { mobile, password },
  });
  // backend should already reject non-admins via token+role check on admin routes
  return data;
}

// Admin endpoints
function buildQuery(params = {}) {
  const sp = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return; // skip empty filters
    }
    sp.append(key, String(value));
  });

  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export const adminApi = {
  getSummary: () => api('/api/admin/dashboard/summary'),
  getMotorProposals: (params = {}) =>
    api(
      `/api/admin/motor-proposals?${buildQuery(params)}`
    ),
  getTravelProposals: (params = {}) =>
    api(
      `/api/admin/travel-proposals?${buildQuery(params)}`
    ),
  getPayments: (params = {}) =>
    api(`/api/admin/payments?${buildQuery(params)}`),
};
