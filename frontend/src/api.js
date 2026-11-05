// Empty = same origin (/api). Apache (XAMPP) proxies /api to Node; Vite dev server does the same.
const BASE = import.meta.env.VITE_API_URL || import.meta.env.BASE_URL.replace(/\/$/, '');
const TOKEN_KEY = 'bc_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

// auth failures call this so AuthContext can log the user out
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Cannot reach the server. Start XAMPP (Apache + MySQL) and run the Node backend (npm start in /backend).');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith('/auth/login')) onUnauthorized();
    const d = data.detail;
    const msg = Array.isArray(d) ? d.map((e) => `${(e.loc || []).slice(-1)[0]}: ${e.msg}`).join(', ') : d;
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return data;
}

export const ksh = (n) => `KSh ${Number(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
