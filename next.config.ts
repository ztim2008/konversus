import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/works",
        destination: "/cases",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
