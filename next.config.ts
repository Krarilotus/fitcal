import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "450mb",
    serverActions: {
      bodySizeLimit: "450mb",
    },
  },
};

export default nextConfig;
