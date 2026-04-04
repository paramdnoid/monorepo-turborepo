import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthSessionUser } from "@/lib/auth/session-user";
import { validateWebAccessTokenSession } from "@/lib/auth/validate-web-session";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { getSidebarBrandTagline } from "@/lib/trades/sidebar-brand-tagline";

import { WebShell } from "@/components/web/shell/web-shell";

/** Cookie + JWT-`exp` müssen pro Request geprüft werden — kein statischer Cache. */
export const dynamic = "force-dynamic";

export default async function WebAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await validateWebAccessTokenSession();
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "/web";
  const nextAfterLogin =
    pathname.startsWith("/web") ? pathname : "/web";

  if (!session.ok) {
    if (session.reason === "superseded_by_app") {
      redirect(
        `/api/auth/invalidate-superseded-web-session?next=${encodeURIComponent(nextAfterLogin)}`,
      );
    }
    redirect(`/login?next=${encodeURIComponent(nextAfterLogin)}`);
  }

  const locale = await getServerLocale();
  const user = await getAuthSessionUser();
  const brandTagline = getSidebarBrandTagline(
    user.session.tradeId,
    locale,
    user.session.tradeSlug,
  );

  return (
    <WebShell
      webSession={{
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        brandTagline,
        tradeSlug: user.session.tradeSlug,
        locale,
      }}
    >
      {children}
    </WebShell>
  );
}
