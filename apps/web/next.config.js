/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Dev: Electron/Desktop lädt oft `http://127.0.0.1:3000` — HMR/Cross-Origin erlauben */
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: [
    "@repo/ui",
    "@repo/fonts",
    "@repo/brand",
  ],
};

export default nextConfig;
