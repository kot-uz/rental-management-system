import { store } from '../../app/store';
import { setCredentials, logout } from '../../entities/auth/model/authSlice';

/**
 * Fetches an authenticated file (e.g. a CSV/PDF export) and triggers a browser
 * download. Export endpoints require the Bearer token, so a plain anchor href
 * won't work.
 *
 * This uses a raw fetch (not RTK Query), so it must replicate the token-refresh
 * behaviour of baseQueryWithReauth: if the access token has expired (a common
 * case mid-session — the UI keeps showing cached data while a fresh request like
 * this one 401s), refresh once via the stored refresh token and retry. Without
 * this, exports silently fail after the access token expires.
 */
export async function downloadFile(path: string, token: string | null): Promise<void> {
  let res = await authedFetch(path, token);

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) res = await authedFetch(path, refreshed);
  }

  if (!res.ok) throw new Error(`Export failed: ${res.status}`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;

  const disposition = res.headers.get('Content-Disposition');
  const match = disposition && /filename="?([^"]+)"?/.exec(disposition);
  anchor.download = match ? match[1] : 'export';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function authedFetch(path: string, token: string | null): Promise<Response> {
  return fetch(`/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

/** Refreshes the access token via the stored refresh token; returns the new
 *  token, or null (and logs out) if refresh is impossible/fails. */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = store.getState().auth.refreshToken;
  if (!refreshToken) {
    store.dispatch(logout());
    return null;
  }

  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    store.dispatch(logout());
    return null;
  }

  // Unwrap the backend's { data: ... } envelope.
  const body = (await res.json()) as { data?: { accessToken: string; refreshToken: string } };
  const tokens = body.data ?? (body as unknown as { accessToken: string; refreshToken: string });
  store.dispatch(setCredentials(tokens));
  return tokens.accessToken;
}
