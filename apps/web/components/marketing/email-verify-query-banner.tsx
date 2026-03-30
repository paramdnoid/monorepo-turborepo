import { getUiText } from "@/content/ui-text";
import { getServerLocale } from "@/lib/i18n/server-locale";

type EmailVerifyQueryBannerProps = {
  status: string | undefined;
};

export async function EmailVerifyQueryBanner({ status }: EmailVerifyQueryBannerProps) {
  if (!status || !["ok", "invalid", "config"].includes(status)) {
    return null;
  }

  const locale = await getServerLocale();
  const t = getUiText(locale);
  const message =
    status === "ok"
      ? t.api.emailVerification.bannerOk
      : status === "config"
        ? t.api.emailVerification.bannerConfig
        : t.api.emailVerification.bannerInvalid;

  const variant =
    status === "ok" ? "border-emerald-500/40 bg-emerald-500/10" : "border-destructive/40 bg-destructive/10";

  return (
    <div
      role="status"
      className={`border-b px-4 py-3 text-center text-sm ${variant} text-foreground`}
    >
      {message}
    </div>
  );
}
