import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
