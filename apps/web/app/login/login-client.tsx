"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";

import {
  BrandWordmark,
  BRAND_LOGO_INTRINSIC,
} from "@/components/brand-logo";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import type { UiText } from "@/content/ui-text";

export type LoginNativeParams = {
  redirect_uri: string;
  state: string;
  code_challenge: string;
  client_id?: string;
};

type LoginClientProps = {
  auth: UiText["auth"];
  apiAuth: UiText["api"]["auth"];
  genericError: string;
  brandingTagline: string;
  native?: LoginNativeParams;
  next?: string;
};

export function LoginClient({
  auth,
  apiAuth,
  genericError,
  brandingTagline,
  native,
  next,
}: LoginClientProps) {
  const [csrf, setCsrf] = useState<string | null>(null);
  const [csrfLoadError, setCsrfLoadError] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/csrf", { credentials: "include" });
        if (!res.ok) {
          throw new Error("csrf_fetch");
        }
        const data = (await res.json()) as { csrf?: string };
        if (cancelled || !data.csrf) {
          return;
        }
        setCsrf(data.csrf);
      } catch {
        if (!cancelled) {
          setCsrfLoadError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError(auth.missingCredentials);
      return;
    }
    if (!csrf) {
      setError(csrfLoadError ? genericError : apiAuth.loginCsrfInvalid);
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        username: username.trim(),
        password,
        csrf,
        ...(next ? { next } : {}),
        ...(native
          ? {
              native: {
                redirect_uri: native.redirect_uri,
                state: native.state,
                code_challenge: native.code_challenge,
                ...(native.client_id ? { client_id: native.client_id } : {}),
              },
            }
          : {}),
      };
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        next?: string;
        redirectUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? apiAuth.invalidCredentials);
        return;
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      if (data.next) {
        window.location.href = data.next;
        return;
      }
      setError(genericError);
    } catch {
      setError(genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPageShell
      hideHero
      heading={undefined}
      subtitle={undefined}
    >
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8">
        <header className="text-center">
          <Link
            href="/"
            className="inline-flex flex-col items-center gap-3"
            aria-label={auth.brandHomeLabel}
          >
            <Image
              src="/logo.png"
              alt=""
              width={BRAND_LOGO_INTRINSIC.width}
              height={BRAND_LOGO_INTRINSIC.height}
              priority
              className="h-12 w-auto max-w-[56px] rounded-full object-contain shadow-sm sm:h-14 sm:max-w-[60px]"
            />
            <BrandWordmark
              tagline={brandingTagline}
              nameClassName="text-center text-2xl font-bold tracking-[0.14em] uppercase sm:text-[2.05rem]"
              taglineClassName="mt-1 block text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase"
            />
          </Link>
        </header>
        <div className="w-full rounded-xl border border-border/60 bg-card/80 p-6 shadow-lg backdrop-blur-md sm:p-8">
          <h1 className="font-sans text-xl font-semibold tracking-tight text-foreground">
            {auth.signInCardTitle}
          </h1>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login-username" className="auth-label text-foreground">
                {auth.usernameOrEmailLabel}
              </Label>
              <Input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                spellCheck={false}
                required
                value={username}
                onChange={(ev) => setUsername(ev.target.value)}
                className="h-11"
                disabled={busy || !csrf}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="auth-label text-foreground">
                {auth.passwordLabel}
              </Label>
              <div className="relative">
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  spellCheck={false}
                  required
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  className="h-11 pr-11"
                  disabled={busy || !csrf}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? auth.passwordHide : auth.passwordShow}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>
            {csrfLoadError ? (
              <p className="text-sm text-destructive" role="alert">
                {genericError}
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-11 w-full"
              disabled={busy || !csrf}
            >
              {!csrf && !csrfLoadError
                ? auth.signInPending
                : busy
                  ? auth.signInPending
                  : auth.signInSubmit}
            </Button>
          </form>
        </div>
      </div>
    </AuthPageShell>
  );
}
