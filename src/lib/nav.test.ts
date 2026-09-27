import { describe, expect, test } from "bun:test";
import {
  isNavActive,
  MANIFEST_SHORTCUTS,
  PRIMARY_NAV,
  primaryNavItem,
} from "./nav";

describe("PRIMARY_NAV", () => {
  test("has unique ids and hrefs that are app paths", () => {
    expect(new Set(PRIMARY_NAV.map((i) => i.id)).size).toBe(PRIMARY_NAV.length);
    expect(new Set(PRIMARY_NAV.map((i) => i.href)).size).toBe(
      PRIMARY_NAV.length,
    );
    for (const item of PRIMARY_NAV) expect(item.href).toMatch(/^\//);
  });

  test("primaryNavItem refuses an unknown id", () => {
    expect(primaryNavItem("cards").href).toBe("/cards");
    expect(() => primaryNavItem("nope")).toThrow();
  });

  test("manifest shortcuts are all tab bar destinations", () => {
    for (const shortcut of MANIFEST_SHORTCUTS) {
      expect(PRIMARY_NAV).toContain(shortcut);
    }
  });

  test("the dex is only active on the dex itself", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/", "/cards")).toBe(false);
    expect(isNavActive("/cards", "/cards/sv1-1")).toBe(true);
  });
});
