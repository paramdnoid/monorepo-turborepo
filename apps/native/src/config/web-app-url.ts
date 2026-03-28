import { Platform } from 'react-native';

/** Port of `pnpm dev` / Next (`apps/web`). */
const DEV_PORT = 3000;

/**
 * Set to your machine’s LAN IP (e.g. `"192.168.1.42"`) when testing on a **physical** device
 * so the phone can reach the dev server. Leave `undefined` for iOS Simulator / Android Emulator.
 */
export const WEB_APP_HOST_OVERRIDE: string | undefined = undefined;

/**
 * Production URL for the embedded WebView app.
 *
 * MUST be `https://...` (no trailing slash required). Keep `undefined` in development.
 */
export const WEB_APP_PROD_URL: string | undefined = undefined;

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function assertHttpsUrl(url: string): string {
  const normalized = trimTrailingSlash(url);
  if (!normalized.startsWith('https://')) {
    throw new Error(
      'Ungültige Produktion-Konfiguration: `WEB_APP_PROD_URL` muss mit `https://` beginnen.',
    );
  }
  return normalized;
}

/**
 * Base URL for the embedded Next.js app in development (no trailing slash).
 * - iOS Simulator: `localhost`
 * - Android Emulator: `10.0.2.2` (host loopback)
 * - Physical device: set `WEB_APP_HOST_OVERRIDE`
 */
function getDevWebAppUrl(): string {
  if (WEB_APP_HOST_OVERRIDE) {
    return `http://${WEB_APP_HOST_OVERRIDE}:${DEV_PORT}`;
  }
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEV_PORT}`;
  }
  return `http://localhost:${DEV_PORT}`;
}

/**
 * Base URL for the embedded Next.js app (no trailing slash).
 *
 * Security behavior:
 * - Development: allows local `http://` origins (simulator/emulator/dev device)
 * - Production: requires an explicit `https://` URL
 */
export function getWebAppUrl(): string {
  if (__DEV__) {
    return getDevWebAppUrl();
  }

  if (!WEB_APP_PROD_URL) {
    throw new Error(
      'WebView im Produktionsmodus benötigt `WEB_APP_PROD_URL` (https://...).',
    );
  }

  return assertHttpsUrl(WEB_APP_PROD_URL);
}
