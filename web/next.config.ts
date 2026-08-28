import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
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
  async headers() {
    if (staticExport) return [];
    return [
      {
        source: "/emblem/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/live/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/apple-touch-icon.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
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
