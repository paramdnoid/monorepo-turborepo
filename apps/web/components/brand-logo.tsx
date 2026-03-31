import Link from "next/link";
import Image from "next/image";
import { uiText } from "@/content/ui-text";

/** Intrinsic size of `public/logo.png` / `@repo/brand/logo`; update if the asset changes. */
export const BRAND_LOGO_INTRINSIC = { width: 1024, height: 1024 } as const;

type BrandWordmarkProps = {
  nameClassName?: string;
  taglineClassName?: string;
  /**
   * Explizit setzen (z. B. von Server-`getUiText`), damit Client Components nicht
   * zwischen SSR-Locale (Proxy default `de`) und `document.documentElement.lang` hydratisieren.
   */
  tagline?: string;
};

export function BrandWordmark({
  nameClassName = "text-[1.28rem]",
  taglineClassName = "hidden pt-0.5 text-[0.46rem] tracking-[0.28em] sm:block",
  tagline: taglineProp,
}: BrandWordmarkProps) {
  const tagline = taglineProp ?? uiText.branding.tagline;
  return (
    <span className="flex flex-col leading-none">
      <span className={`font-sans font-bold tracking-tight ${nameClassName}`}>
        Zunft<span className="text-foreground/70">Gewerk</span>
      </span>
      <span
        className={`${taglineClassName} font-semibold uppercase text-muted-foreground`}
      >
        {tagline}
      </span>
    </span>
  );
}

export function BrandLogo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label={uiText.branding.homeAriaLabel}>
      <Image
        src="/logo.png"
        alt=""
        role="presentation"
        width={BRAND_LOGO_INTRINSIC.width}
        height={BRAND_LOGO_INTRINSIC.height}
        className="h-[36px] w-auto max-w-[40px] -translate-y-[3px] object-contain"
        priority
      />
      <BrandWordmark />
    </Link>
  );
}
