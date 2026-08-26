import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.29.175"],
  async redirects() {
    return [
      {
        source: "/demo",
        destination: "/request",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
