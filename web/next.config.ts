import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_STATIC_HOST: staticExport ? "1" : "",
  },
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
