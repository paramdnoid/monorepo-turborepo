export const AUTH_COOKIE_NAME = "zgwerk_access_token";

/** Refresh-Token für „Angemeldet bleiben“ (Keycloak `offline_access` / Rotation). */
export const AUTH_REFRESH_COOKIE_NAME = "zgwerk_refresh_token";

/** CSRF-Double-Submit für POST /api/auth/login (Browser). */
export const LOGIN_CSRF_COOKIE_NAME = "zgwerk_login_csrf";
