const TOKEN_KEY = 'lla_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, headers = {}, isForm = false } = {}) {
  const token = getToken();
  const finalHeaders = { ...headers };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) finalHeaders['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, {
    method,
    headers: finalHeaders,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return { data, res };
}

export const api = {
  // auth
  register: (email, password) => request('/auth/register', { method: 'POST', body: { email, password } }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  forgotPassword: (email, newPassword) => request('/auth/forgot-password', { method: 'POST', body: { email, newPassword } }),

  // account
  updateSettings: (payload) => request('/account/settings', { method: 'PUT', body: payload }),
  changePassword: (currentPassword, newPassword) => request('/account/password', { method: 'PUT', body: { currentPassword, newPassword } }),
  resetAccount: () => request('/account/reset', { method: 'POST', body: { confirm: true } }),
  deleteAccount: () => request('/account', { method: 'DELETE', body: { confirm: true } }),

  // lists
  listCounts: () => request('/lists'),
  listRecords: (table) => request(`/lists/${table}`),
  addRecord: (table, payload) => request(`/lists/${table}`, { method: 'POST', body: payload }),
  updateRecord: (table, id, payload) => request(`/lists/${table}/${id}`, { method: 'PUT', body: payload }),
  deleteRecord: (table, id) => request(`/lists/${table}/${id}`, { method: 'DELETE' }),
  moveRecord: (table, id, to) => request(`/lists/${table}/${id}/move`, { method: 'POST', body: { to } }),

  // import
  importCsv: (file, advanced) => {
    const form = new FormData();
    form.append('file', file);
    form.append('advanced', advanced ? 'true' : 'false');
    return request('/import', { method: 'POST', body: form, isForm: true });
  },
};

export function exportDbUrl() {
  // Downloaded via a plain anchor click with the token appended is not
  // possible for auth headers on a GET download, so we fetch as a blob.
  return '/api/account/export';
}

export async function downloadExport() {
  const token = getToken();
  const res = await fetch('/api/account/export', { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'learning-language-database.zip';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
