"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";

import { TradeFeatureIcon } from "@/components/marketing/trades/trade-feature-icon";
import { getMalerModulesOrdered } from "@/lib/trades/maler-modules";

import type { WebDesktopAuthState } from "./web-desktop-bridge";
import { useWebApp } from "./web-app-context";
import { DesktopDownloadCard } from "./desktop-download-card";

const API_BASE =
  process.env.NEXT_PUBLIC_WEB_API_BASE_URL ?? "http://127.0.0.1:4000";

const WEB_ME_PATH = "/api/auth/backend-me";

/** Nur in der Entwicklung: Roh-JSON von `/api/auth/backend-me` bzw. `/v1/me` (nicht in Produktion nötig). */
const SHOW_BACKEND_ME_DEBUG = process.env.NODE_ENV === "development";

function formatBackendMeError(status: number, body: string): string {
  try {
    const j = JSON.parse(body) as {
      code?: string;
      detail?: string;
      error?: string;
      hint?: string;
    };
    if (typeof j.detail === "string" && j.detail.trim()) {
      const head = [String(status), j.code].filter(Boolean).join(" ");
      const hint =
        typeof j.hint === "string" && j.hint.trim()
          ? `\n\n${j.hint.trim()}`
          : "";
      return `${head}: ${j.detail}${hint}`;
    }
    if (typeof j.hint === "string" && j.hint.trim()) {
      return `${String(status)} ${j.code ?? ""}: ${j.hint.trim()}`;
    }
    if (typeof j.error === "string") {
      return [String(status), j.code ?? j.error].join(" ");
    }
  } catch {
    /* Rohtext anzeigen */
  }
  return `${String(status)} ${body}`;
}

export function WebOverviewContent() {
  const { session: webSession, logout, logoutBusy, logoutError } = useWebApp();
  const malerModules = useMemo(
    () => getMalerModulesOrdered(webSession.locale),
    [webSession.locale],
  );
  const [ipcStatus, setIpcStatus] = useState<string>("…");
  const [isElectronShell, setIsElectronShell] = useState(false);
  const [auth, setAuth] = useState<WebDesktopAuthState | null>(null);
  const [meJson, setMeJson] = useState<string | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [meSource, setMeSource] = useState<"desktop" | "web" | null>(null);

  const refreshAuth = useCallback(async () => {
    if (!window.desktop?.authGetState) {
      setAuth({ status: "signed_out" });
      return;
    }
    const next = await window.desktop.authGetState();
    setAuth(next);
  }, []);

  useEffect(() => {
    const ping = window.desktop?.ping;
    if (typeof ping !== "function") {
      setIpcStatus("kein Electron");
      setIsElectronShell(false);
      return;
    }
    void ping()
      .then((msg) => {
        setIpcStatus(msg);
        setIsElectronShell(true);
      })
      .catch(() => {
        setIpcStatus("nicht erreichbar");
        setIsElectronShell(false);
      });
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (!SHOW_BACKEND_ME_DEBUG) {
      setMeJson(null);
      setMeError(null);
      setMeSource(null);
      return;
    }
    if (auth === null) {
      setMeJson(null);
      setMeError(null);
      setMeSource(null);
      return;
    }
    if (auth.status === "signed_in") {
      setMeSource("desktop");
      let cancelled = false;
      void (async () => {
        const token = await window.desktop?.authGetAccessToken?.();
        if (!token || cancelled) return;
        try {
          const res = await fetch(`${API_BASE}/v1/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const text = await res.text();
          if (!res.ok) {
            setMeError(`${String(res.status)} ${text}`);
            setMeJson(null);
            return;
          }
          setMeJson(text);
          setMeError(null);
        } catch (e) {
          setMeError(e instanceof Error ? e.message : String(e));
          setMeJson(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    setMeSource("web");
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(WEB_ME_PATH, { credentials: "include" });
        const text = await res.text();
        if (cancelled) return;
        if (!res.ok) {
          setMeError(formatBackendMeError(res.status, text));
          setMeJson(null);
          return;
        }
        setMeJson(text);
        setMeError(null);
      } catch (e) {
        if (!cancelled) {
          setMeError(e instanceof Error ? e.message : String(e));
          setMeJson(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  return (
    <>
      <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="mb-2 text-lg font-semibold tracking-tight">
          Willkommen
        </h2>
        <p className="text-sm text-muted-foreground">
          Diese Route nutzt{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            @repo/ui/sidebar
          </code>{" "}
          in der Next.js App (App Router).
        </p>
        <p className="mt-4 text-sm">
          <span className="text-muted-foreground">IPC ping: </span>
          <span className="font-mono text-foreground">{ipcStatus}</span>
        </p>
      </section>

      <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="mb-1 text-lg font-semibold tracking-tight">
          {webSession.locale === "en"
            ? "Painter & decorator"
            : "Maler & Tapezierer"}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {webSession.locale === "en"
            ? "Open a module to explore the preview."
            : "Module öffnen, um die Vorschau zu erkunden."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {malerModules.map(({ href, feature, segment }) => (
            <Link
              key={segment}
              href={href}
              className="flex gap-3 rounded-lg border border-transparent bg-muted/30 p-4 transition-colors hover:border-border hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 ring-1 ring-primary/10">
                <TradeFeatureIcon name={feature.icon} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {feature.label}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <DesktopDownloadCard isElectronShell={isElectronShell} />

      <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="mb-2 text-lg font-semibold tracking-tight">
          Anmeldung (Web / Keycloak)
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          <strong className="font-medium text-foreground">Web:</strong>{" "}
          Passwort-Login über die Next.js-App; Session als httpOnly-Cookie.
        </p>
        {logoutError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Anmeldung</AlertTitle>
            <AlertDescription>{logoutError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mb-4 rounded-lg border bg-muted/30 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Web (Browser)
          </p>
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">Angemeldet als: </span>
            <span className="font-medium text-foreground">
              {webSession.name}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">{webSession.email}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={logoutBusy}
            onClick={() => void logout()}
          >
            {logoutBusy ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Abmelden (Web)
          </Button>
        </div>
      </section>

      {SHOW_BACKEND_ME_DEBUG && auth !== null ? (
        <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="mb-2 text-lg font-semibold tracking-tight">
            API{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-normal">
              GET{" "}
              {meSource === "desktop"
                ? `${API_BASE}/v1/me`
                : WEB_ME_PATH}
            </code>
          </h2>
          <p className="mb-2 text-xs text-muted-foreground">
            {meSource === "desktop"
              ? "Direktaufruf der API mit Bearer-Token aus Electron."
              : "Same-Origin-BFF mit httpOnly-Cookie (kein Token im Browser-JS)."}
          </p>
          {meError ? (
            <Alert variant="destructive">
              <AlertTitle>/v1/me</AlertTitle>
              <AlertDescription className="font-mono text-xs whitespace-pre-wrap">
                {meError}
              </AlertDescription>
            </Alert>
          ) : (
            <pre className="max-h-64 min-w-0 w-full overflow-x-auto overflow-y-auto rounded-md bg-muted p-3 text-xs">
              {meJson ?? "Lade …"}
            </pre>
          )}
        </section>
      ) : null}
    </>
  );
}
