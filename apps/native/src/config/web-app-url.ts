import { Platform } from "react-native";

/** Port of `pnpm dev` / Next (`apps/web`). */
const PORT = 3000;

/**
 * Set to your machine’s LAN IP (e.g. `"192.168.1.42"`) when testing on a **physical** device
 * so the phone can reach the dev server. Leave `undefined` for iOS Simulator / Android Emulator.
 */
export const WEB_APP_HOST_OVERRIDE: string | undefined = undefined;

/**
 * Base URL for the embedded Next.js app (no trailing slash).
 * - iOS Simulator: `localhost`
 * - Android Emulator: `10.0.2.2` (host loopback)
 * - Physical device: set `WEB_APP_HOST_OVERRIDE`
 */
export function getWebAppUrl(): string {
  if (WEB_APP_HOST_OVERRIDE) {
    return `http://${WEB_APP_HOST_OVERRIDE}:${PORT}`;
  }
  if (Platform.OS === "android") {
    return `http://10.0.2.2:${PORT}`;
  }
  return `http://localhost:${PORT}`;
}
