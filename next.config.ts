import type { NextConfig } from "next";

const isAppBuild = process.env.BUILD_TARGET === 'app';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isAppBuild ? undefined : '/family-insurance',
  assetPrefix: isAppBuild ? undefined : '/family-insurance/',
  images: { unoptimized: true },
};

export default nextConfig;
