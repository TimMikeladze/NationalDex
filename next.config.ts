import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    // React <ViewTransition> for route changes (AppShell, docs/pwa.md).
    viewTransition: true,
  },
  // The service worker must never be served stale, or a deploy can't replace
  // it. See docs/pwa.md.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "play.pokemonshowdown.com",
        pathname: "/sprites/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/PokeAPI/sprites/master/sprites/**",
      },
      {
        protocol: "https",
        hostname: "img.pokemondb.net",
        pathname: "/sprites/**",
      },
      {
        protocol: "https",
        hostname: "img.pokemondb.net",
        pathname: "/artwork/**",
      },
      {
        protocol: "https",
        hostname: "assets.tcgdex.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
