/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@repo/ui",
    "@repo/fonts",
    "@repo/brand",
  ],
};

export default nextConfig;
