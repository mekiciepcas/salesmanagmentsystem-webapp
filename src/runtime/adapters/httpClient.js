(function attachRuntimeHttpClient() {
  if (typeof window === 'undefined') return;
  if (window.runtimeHttpClient) return;

  function authHeaders() {
    const token =
      localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function parseJson(res) {
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json')) return res.json();
    const text = await res.text();
    return { success: false, error: text || res.statusText };
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });
    const payload = await parseJson(response);
    if (!response.ok) {
      const error = new Error(payload.error || response.statusText);
      error.status = response.status;
      error.detail = payload.detail || '';
      throw error;
    }
    return payload;
  }

  window.runtimeHttpClient = {
    get(url) {
      return request(url, { method: 'GET' });
    },
    post(url, body) {
      return request(url, { method: 'POST', body: JSON.stringify(body) });
    },
  };
})();
