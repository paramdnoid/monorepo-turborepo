/**
 * Shape of `contextBridge.exposeInMainWorld("desktop", …)` for renderer typing.
 */
export type DesktopAuthUser = {
  sub: string;
  name: string | null;
  email: string | null;
};

export type DesktopAuthState =
  | { status: "signed_out" }
  | {
      status: "signed_in";
      user: DesktopAuthUser;
      /** Epoch ms — Access-Token Ablauf (ungefähr, aus JWT `exp` oder Token-Response). */
      accessTokenExpiresAt: number;
    };

export type DesktopApi = {
  ping: () => Promise<string>;
  authGetState: () => Promise<DesktopAuthState>;
  authLogin: () => Promise<DesktopAuthState>;
  authLogout: () => Promise<void>;
  /** Kurzlebiger Access-Token für `Authorization: Bearer` gegen die HTTP-API. */
  authGetAccessToken: () => Promise<string | null>;
  /** App beenden (nach Abmelden, damit kein automatischer Login-Flow startet). */
  quitApp: () => Promise<void>;
};
