import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cliniq/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
