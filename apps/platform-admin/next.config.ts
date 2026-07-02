import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@kloqra/ui", "@kloqra/contracts", "@kloqra/web-shared"],
  experimental: {
    optimizePackageImports: ["lucide-react"]
  }
};

export default nextConfig;
