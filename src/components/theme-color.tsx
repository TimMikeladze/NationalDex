"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { SURFACE } from "@/lib/pwa-assets";

/**
 * Keeps the Android status bar the colour of the app underneath it.
 *
 * The static `themeColor` in the root layout can only answer with a media
 * query, and the theme here is a stored choice as often as it is the system's
 * — a phone in dark mode reading a deliberately light app, or the other way
 * round. So the markup carries the right answer for the launch, and this
 * carries the right answer for the rest of the session: every `theme-color`
 * meta is rewritten with the theme that actually resolved, so whichever one
 * the browser is matching on, it is looking at the same colour.
 */
export function ThemeColor() {
  const { resolvedTheme } = useTheme();
  // Next rewrites `<head>` from the RSC payload on every client navigation,
  // which puts the markup's colour back — a dark app would go back to a white
  // status bar on the way to any page. Re-applying per route holds it.
  const pathname = usePathname();

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger rather than an input — see above.
  useEffect(() => {
    const color = resolvedTheme === "dark" ? SURFACE.dark : SURFACE.light;
    const metas = document.head.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );

    if (metas.length === 0) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = color;
      document.head.appendChild(meta);
      return;
    }

    for (const meta of metas) {
      meta.content = color;
    }
  }, [resolvedTheme, pathname]);

  return null;
}
