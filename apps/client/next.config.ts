import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true"
});

const nextConfig: NextConfig = {
  transpilePackages: ["@kloqra/ui", "@kloqra/contracts", "@kloqra/web-shared"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-popover",
      "@radix-ui/react-alert-dialog",
      "motion/react",
      "react-grid-layout"
    ]
  }
};

export default withBundleAnalyzer(nextConfig);
