// ── Session helpers ──────────────────────────────────────────
// Central place to check login state and to announce "session expired"
// from anywhere in the app (e.g. from api.ts when a request gets 401).

export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

export const isLoggedIn = (): boolean => {
  return !!localStorage.getItem('userId');
};

// Call this once you detect an expired/invalid session
// (401 response, missing/invalid token, etc.)
export const handleSessionExpired = (): void => {
  localStorage.removeItem('userId');
  localStorage.removeItem('token'); // remove any other auth keys you store

  // Let any listening component (App.tsx) know, so it can redirect.
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
};

export const logout = (): void => {
  handleSessionExpired();
};