/**
 * Minimale Typisierung für `window.desktop` (Electron-Preload), ohne Abhängigkeit von `@repo/electron`.
 */
export type WebDesktopAuthUser = {
  sub: string;
  name: string | null;
  email: string | null;
};

export type WebDesktopAuthState =
  | { status: "signed_out" }
  | {
      status: "signed_in";
      user: WebDesktopAuthUser;
      accessTokenExpiresAt: number;
    };

export type WebDesktopBridge = {
  ping: () => Promise<string>;
  authGetState: () => Promise<WebDesktopAuthState>;
  authLogin: () => Promise<WebDesktopAuthState>;
  authLogout: () => Promise<void>;
  authGetAccessToken: () => Promise<string | null>;
  quitApp: () => Promise<void>;
};

declare global {
  interface Window {
    desktop?: WebDesktopBridge;
  }
}

export {};
