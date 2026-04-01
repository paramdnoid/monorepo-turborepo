import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginClient, type LoginNativeParams } from "@/app/login/login-client";
import { getUiText } from "@/content/ui-text";
import { resolveLoginRedirect } from "@/lib/auth/resolve-post-login-next-path";
import {
  getServerAccessToken,
  isAccessTokenCookieMissingOrExpired,
} from "@/lib/auth/server-token";
import { getServerLocale } from "@/lib/i18n/server-locale";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return undefined;
}

function parseNative(
  sp: Record<string, string | string[] | undefined>,
): LoginNativeParams | undefined {
  const redirect_uri = firstString(sp.redirect_uri);
  const state = firstString(sp.state);
  const code_challenge = firstString(sp.code_challenge);
  const client_id = firstString(sp.client_id);
  const anyParam = redirect_uri ?? state ?? code_challenge ?? client_id;
  if (!anyParam) {
    return undefined;
  }
  if (!redirect_uri || !state || !code_challenge) {
    return undefined;
  }
  return {
    redirect_uri,
    state,
    code_challenge,
    ...(client_id ? { client_id } : {}),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const ui = getUiText(await getServerLocale());
  return {
    title: ui.auth.signInCardTitle,
    description: ui.auth.signInDescription,
  };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolved = searchParams ? await searchParams : {};

  const token = await getServerAccessToken();
  const native = parseNative(resolved);
  /** Desktop-OAuth (PKCE + Callback): nicht nach /web umleiten — sonst kein Handoff möglich. */
  if (
    !native &&
    !isAccessTokenCookieMissingOrExpired(token) &&
    token
  ) {
    const next = firstString(resolved.next);
    redirect(resolveLoginRedirect(next));
  }

  const locale = await getServerLocale();
  const text = getUiText(locale);
  const next = firstString(resolved.next);

  const hasWebSession =
    !isAccessTokenCookieMissingOrExpired(token) && Boolean(token);

  return (
    <LoginClient
      auth={text.auth}
      apiAuth={text.api.auth}
      genericError={text.api.genericError}
      brandingTagline={text.branding.tagline}
      native={native}
      hasWebSession={Boolean(native) && hasWebSession}
      {...(next ? { next } : {})}
    />
  );
}
