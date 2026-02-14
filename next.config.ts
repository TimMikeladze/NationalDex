import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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
    ],
  },
};

export default nextConfig;
