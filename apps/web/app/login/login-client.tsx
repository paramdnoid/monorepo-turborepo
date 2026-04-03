"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
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
  forgotPasswordHref: string;
  /** Registrierung / Onboarding (z. B. `/onboarding`). */
  signUpHref: string;
  native?: LoginNativeParams;
  /** Web-Session vorhanden: Desktop-OAuth ohne erneutes Passwort (OTC-Handoff). */
  hasWebSession?: boolean;
  next?: string;
};

export function LoginClient({
  auth,
  apiAuth,
  genericError,
  brandingTagline,
  forgotPasswordHref,
  signUpHref,
  native,
  hasWebSession = false,
  next,
}: LoginClientProps) {
  const [csrf, setCsrf] = useState<string | null>(null);
  const [csrfLoadError, setCsrfLoadError] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handoffStarted = useRef(false);

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

  useEffect(() => {
    if (!native || !hasWebSession || handoffStarted.current) {
      return;
    }
    handoffStarted.current = true;
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch("/api/auth/native-handoff-from-web-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            csrf: "",
            native: {
              redirect_uri: native.redirect_uri,
              state: native.state,
              code_challenge: native.code_challenge,
              ...(native.client_id ? { client_id: native.client_id } : {}),
            },
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          redirectUrl?: string;
          error?: string;
        };
        if (!res.ok || !data.redirectUrl) {
          setError(data.error ?? genericError);
          setBusy(false);
          handoffStarted.current = false;
          return;
        }
        window.location.href = data.redirectUrl;
      } catch {
        setError(genericError);
        setBusy(false);
        handoffStarted.current = false;
      }
    })();
  }, [native, hasWebSession, genericError]);

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
        rememberMe,
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
    <AuthPageShell hideHero>
      <section className="premium-panel animate-panel-enter rounded-[1.15rem] p-5 backdrop-blur-sm sm:p-7 md:p-8">
        <div className="relative z-2 space-y-8">
          <div className="space-y-3.5 pb-0.5">
            <Link
              href="/"
              className="flex w-fit items-center gap-1.5"
              aria-label={auth.brandHomeLabel}
            >
              <Image
                src="/logo.png"
                alt=""
                width={BRAND_LOGO_INTRINSIC.width}
                height={BRAND_LOGO_INTRINSIC.height}
                priority
                className="h-7 w-auto max-w-[30px] rounded-full object-contain shadow-sm"
              />
              <BrandWordmark
                tagline={brandingTagline}
                nameClassName="text-[1rem]"
                taglineClassName="text-[7px] tracking-[0.16em]"
              />
            </Link>

            <span className="auth-form-kicker mt-1 inline-flex">
              <span className="auth-form-kicker-dot" />
              {auth.signInBadge}
            </span>

            <h1 className="font-sans text-2xl leading-[0.96] font-bold tracking-tight text-foreground sm:text-3xl">
              {auth.signInCardTitle}
            </h1>
            <p className="text-muted-foreground max-w-lg text-sm leading-relaxed sm:text-[0.9375rem]">
              {auth.signInDescription}
            </p>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label
                htmlFor="login-username"
                className="auth-label block text-foreground"
              >
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
                className="h-10"
                disabled={busy || (!csrf && !native)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5">
                <Label
                  htmlFor="login-password"
                  className="auth-label block text-foreground"
                >
                  {auth.passwordLabel}
                </Label>
                <Link
                  href={forgotPasswordHref}
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  {auth.forgotPassword}
                </Link>
              </div>
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
                  className="h-10 pr-11"
                  disabled={busy || (!csrf && !native)}
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

            <div className="flex items-start gap-2.5 pt-0.5">
              <Checkbox
                id="login-remember"
                checked={rememberMe}
                onCheckedChange={(v) => setRememberMe(v === true)}
                disabled={busy || (!csrf && !native)}
              />
              <label
                htmlFor="login-remember"
                className="cursor-pointer text-sm leading-snug text-foreground select-none"
              >
                {auth.rememberMeLabel}
              </label>
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

            <div className="space-y-6 pt-1">
              <Button
                type="submit"
                className="h-10 w-full text-[0.9375rem] font-semibold"
                disabled={busy || (!csrf && !native)}
              >
                {!csrf && !csrfLoadError && !native
                  ? auth.signInPending
                  : busy
                    ? native && hasWebSession
                      ? auth.signInDesktopHandoff
                      : auth.signInPending
                    : auth.signInSubmit}
              </Button>

              <p className="text-muted-foreground border-border/60 border-t pt-6 text-center text-sm leading-relaxed">
                {auth.noAccountQuestion}{" "}
                <Link
                  href={signUpHref}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {auth.signUpCta}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </section>
    </AuthPageShell>
  );
}
