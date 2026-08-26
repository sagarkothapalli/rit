import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(staticExport
    ? {
        output: "export" as const,
        images: { unoptimized: true },
      }
    : {}),
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.29.175"],
  async redirects() {
    if (staticExport) return [];
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
