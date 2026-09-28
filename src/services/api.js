const BASE_URL = 'http://127.0.0.1:8000/api/v1';

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

async function tryRefreshToken() {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.access) {
        localStorage.setItem('access_token', data.access);
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
        return data.access;
      }
    }
  } catch {
    // Refresh failed
  }

  // If refresh failed completely, clear invalid tokens
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_user');
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  return null;
}

export async function ensureAuthToken() {
  let token = localStorage.getItem('access_token');
  if (!token || token.startsWith('mock_')) {
    try {
      const res = await fetch(`${BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access) {
          localStorage.setItem('access_token', data.access);
          if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
          if (data.user) localStorage.setItem('auth_user', JSON.stringify(data.user));
          return data.access;
        }
      }
    } catch {
      // offline / fallback
    }
  }
  return token;
}

export async function request(endpoint, options = {}, isRetry = false) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  let token = localStorage.getItem('access_token');
  if (!token || token.startsWith('mock_')) {
    if (!endpoint.includes('/auth/login')) {
      token = await ensureAuthToken();
    }
  }

  if (token && !token.startsWith('mock_')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers
    });

    if (res.status === 401 && !isRetry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await tryRefreshToken();
        isRefreshing = false;
        if (newToken) {
          onRefreshed(newToken);
          return request(endpoint, options, true);
        }
      } else {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(async (newToken) => {
            if (newToken) {
              try {
                resolve(await request(endpoint, options, true));
              } catch (err) {
                reject(err);
              }
            } else {
              reject(new Error('Session expired'));
            }
          });
        });
      }
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_user');
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
      throw new Error(errData.error || errData.detail || `Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (!res || res.status !== 401) {
      console.warn(`API Error on ${url}:`, err.message);
    }
    throw err;
  }
}

export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};
