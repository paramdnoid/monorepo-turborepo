/**
 * Basis-URL der Next.js-Web-App für den zentralen Login (gleicher OAuth/PKCE-Flow wie Desktop).
 * Später: `expo-auth-session` / `WebBrowser.openAuthSessionAsync` gegen `${WEB_LOGIN_ORIGIN}/login?...`.
 */
export const WEB_LOGIN_ORIGIN =
  process.env.EXPO_PUBLIC_WEB_ORIGIN ?? "http://127.0.0.1:3000";
