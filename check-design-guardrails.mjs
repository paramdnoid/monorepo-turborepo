import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {Array<{file: string; reason: string; mustInclude?: string[]; mustNotInclude?: string[]}>} */
const checks = [
  {
    file: "packages/turborepo-starter/src/content.ts",
    reason: "Shared starter copy must expose web/docs deploy URLs.",
    mustInclude: ["export const deployHrefWeb", "export const deployHrefDocs"],
  },
  {
    file: "apps/web/app/layout.tsx",
    reason: "Web root layout must use the shared brand asset (favicon/metadata).",
    mustInclude: ['from "@repo/brand/logo"'],
  },
  {
    file: "apps/web/app/page.tsx",
    reason: "Web homepage must use product content and server locale.",
    mustInclude: ['from "@/content/ui-text"', "getServerLocale"],
  },
  {
    file: "apps/docs/app/page.tsx",
    reason: "Docs homepage must import shared starter content and avoid inline URL drift.",
    mustInclude: [
      'from "@repo/turborepo-starter"',
      "deployHrefDocs",
      "docsHref",
      "templatesHref",
      "turborepoSiteHref",
      "alertMessage",
      "step2Text",
    ],
    mustNotInclude: [
      "const deployHref =",
      "https://turborepo.dev/docs?utm_source",
      "https://vercel.com/templates?search=turborepo",
      "https://turborepo.dev?utm_source=create-turbo",
      "window.alert(\"Hello from @repo/ui\")",
    ],
  },
  {
    file: "apps/native/global.css",
    reason: "Native app must import shared design tokens from packages/ui.",
    mustInclude: ['@import "../../packages/ui/src/styles/theme-tokens.css";'],
  },
  {
    file: "apps/native/src/NativeTurborepoApp.tsx",
    reason: "Native starter UI must align theme with system mode.",
    mustInclude: ["useColorScheme", "isDarkMode", "BrandLogo"],
    mustNotInclude: ["'dark flex-1 bg-background'"],
  },
  {
    file: "apps/native/src/WebShell.tsx",
    reason: "WebShell must use stricter navigation origin controls and avoid hardcoded white overlay.",
    mustInclude: ["originWhitelist={[allowedOrigin]}", "onShouldStartLoadWithRequest"],
    mustNotInclude: ["originWhitelist={['http://*', 'https://*']}", "backgroundColor: '#fff'"],
  },
];

const violations = [];

for (const check of checks) {
  const filePath = path.join(rootDir, check.file);
  const source = await readFile(filePath, "utf8");

  for (const needle of check.mustInclude ?? []) {
    if (!source.includes(needle)) {
      violations.push(
        `[${check.file}] Missing required pattern: ${JSON.stringify(needle)} (${check.reason})`,
      );
    }
  }

  for (const needle of check.mustNotInclude ?? []) {
    if (source.includes(needle)) {
      violations.push(
        `[${check.file}] Forbidden pattern found: ${JSON.stringify(needle)} (${check.reason})`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error("Design guardrails check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Design guardrails passed.");
