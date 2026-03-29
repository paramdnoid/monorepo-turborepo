/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@repo/ui",
    "@repo/fonts",
    "@repo/brand",
    "@repo/turborepo-starter",
  ],
};

export default nextConfig;
