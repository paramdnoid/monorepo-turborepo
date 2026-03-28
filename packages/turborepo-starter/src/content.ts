/**
 * Shared copy and URLs for the Turborepo starter screen (web + native + docs).
 * UI primitives differ: web/docs use @repo/ui (DOM); native uses apps/native/components/ui.
 */

const deployHrefBase =
  "https://vercel.com/new/clone?demo-description=Learn+to+implement+a+monorepo+with+a+two+Next.js+sites+that+has+installed+three+local+packages.&demo-image=%2F%2Fimages.ctfassets.net%2Fe5382hct74si%2F4K8ZISWAzJ8X1504ca0zmC%2F0b21a1c6246add355e55816278ef54bc%2FBasic.png&demo-title=Monorepo+with+Turborepo&demo-url=https%3A%2F%2Fexamples-basic-web.vercel.sh%2F&from=templates&project-name=Monorepo+with+Turborepo&repository-name=monorepo-turborepo&repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fturborepo%2Ftree%2Fmain%2Fexamples%2Fbasic&skippable-integrations=1&teamSlug=vercel&utm_source=create-turbo";

export const deployHrefWeb = `${deployHrefBase}&root-directory=apps%2Fweb`;
export const deployHrefDocs = `${deployHrefBase}&root-directory=apps%2Fdocs`;

/** Backward-compatible alias for existing imports (web/native). */
export const deployHref = deployHrefWeb;

export const docsHref = "https://turborepo.dev/docs?utm_source";

export const templatesHref =
  "https://vercel.com/templates?search=turborepo&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app";

export const turborepoSiteHref =
  "https://turborepo.dev?utm_source=create-turbo";

export const title = "Turborepo Starter";

export const description = "Monorepo mit Next.js, Tailwind und shadcn/ui";

export const step1CodePathWeb = "apps/web/app/page.tsx";
export const step1CodePathDocs = "apps/docs/app/page.tsx";

/** Backward-compatible alias used by native and web starter screens. */
export const step1CodePath = step1CodePathWeb;

export const step2Text = "Speichern — Änderungen erscheinen sofort.";

/** Same string as web `window.alert` / native `Alert` */
export const alertMessage = "Hello from @repo/ui";
