import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true"
});

const nextConfig: NextConfig = {
  transpilePackages: ["@kloqra/ui", "@kloqra/contracts", "@kloqra/web-shared"],
  experimental: {
    optimizePackageImports: ["@kloqra/ui", "lucide-react", "recharts"]
  }
};

export default withBundleAnalyzer(nextConfig);
