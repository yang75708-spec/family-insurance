import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/family-insurance',
  assetPrefix: '/family-insurance/',
  images: { unoptimized: true },
};

export default nextConfig;
