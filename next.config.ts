import type { NextConfig } from "next";

// Build-Datum zur Build-Zeit generieren (deutsches Format)
const buildDate = new Date().toLocaleDateString("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
  reactStrictMode: true,
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: [
    "*.replit.dev",
    "*.spock.replit.dev",
    "*.picard.replit.dev",
    "*.devinapps.com",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  serverExternalPackages: ["adm-zip", "basic-ftp"],
};

export default nextConfig;
