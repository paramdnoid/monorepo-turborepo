import nextEnv from "@next/env";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
nextEnv.loadEnvConfig(repoRoot, process.env.NODE_ENV !== "production");

/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Dev: Electron/Desktop lädt oft `http://127.0.0.1:3000` — HMR/Cross-Origin erlauben */
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: [
    "@repo/ui",
    "@repo/fonts",
    "@repo/brand",
  ],
  async redirects() {
    return [
      {
        source: "/web/painter/employee-management",
        destination: "/web/employees",
        permanent: true,
      },
      {
        source: "/web/painter/scheduling",
        destination: "/web/scheduling",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
