import type { MetadataRoute } from "next";
import { MANIFEST_SHORTCUTS } from "@/lib/nav";
import { ICON_VARIANTS, iconPath, SURFACE } from "@/lib/pwa-assets";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "NationalDex",
    short_name: "NationalDex",
    description:
      "Every generation, indexed. Pokemon stats, moves, cards, teams and decks — offline too.",
    lang: "en",
    // The dex is the app; there is no marketing page in front of it.
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    // Android paints its launch screen with this before the page exists; dark
    // matches the icon plate and the dark splash.
    background_color: SURFACE.dark,
    theme_color: SURFACE.dark,
    categories: ["games", "reference", "entertainment"],
    icons: [
      { src: "/icons/logo-app.svg", sizes: "any", type: "image/svg+xml" },
      ...Object.entries(ICON_VARIANTS).map(([variant, icon]) => ({
        src: iconPath(variant as keyof typeof ICON_VARIANTS),
        sizes: `${icon.size}x${icon.size}`,
        type: "image/png",
        purpose: icon.purpose,
      })),
    ],
    shortcuts: MANIFEST_SHORTCUTS.map((item) => ({
      name: item.name,
      url: item.href,
      icons: [{ src: iconPath("192"), sizes: "192x192", type: "image/png" }],
    })),
  };
}
