import { describe, expect, test } from "bun:test";
import { PRIMARY_NAV } from "@/lib/nav";
import { ICON_VARIANTS } from "@/lib/pwa-assets";
import manifest from "./manifest";
import { generateStaticParams } from "./pwa-icon/[variant]/route";

describe("manifest", () => {
  const m = manifest();

  test("installs standalone, starting inside its scope", () => {
    expect(m.display).toBe("standalone");
    expect(m.start_url?.startsWith(m.scope ?? "")).toBe(true);
    expect(m.id).toBeTruthy();
  });

  test("has 192, 512 and a maskable 512, all served by the icon route", () => {
    const served = generateStaticParams().map((p) => `/pwa-icon/${p.variant}`);
    const png = (m.icons ?? []).filter((i) => i.type === "image/png");
    for (const icon of png) expect(served).toContain(icon.src);
    const sizes = png.map((i) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toContain("192x192:any");
    expect(sizes).toContain("512x512:any");
    expect(sizes).toContain("512x512:maskable");
    expect(Object.keys(ICON_VARIANTS).length).toBe(served.length);
  });

  test("shortcuts point at real tab bar destinations", () => {
    const hrefs = PRIMARY_NAV.map((i) => i.href) as string[];
    expect(m.shortcuts?.length).toBeGreaterThan(0);
    for (const shortcut of m.shortcuts ?? []) {
      expect(hrefs).toContain(shortcut.url);
    }
  });
});
