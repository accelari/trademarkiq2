import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: [
    "*.replit.dev",
    "*.spock.replit.dev",
    "*.picard.replit.dev",
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
