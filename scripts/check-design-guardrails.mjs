import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");

/** @type {Array<{file: string; reason: string; mustInclude?: string[]; mustNotInclude?: string[]}>} */
const checks = [
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
