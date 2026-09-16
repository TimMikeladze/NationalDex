import { describe, expect, test } from "bun:test";
import { buildShareUpdate, parseShareBody } from "./sharing";

describe("parseShareBody", () => {
  test("accepts the three visibilities and an optional rotate flag", () => {
    expect(parseShareBody({ visibility: "unlisted" })).toEqual({
      visibility: "unlisted",
    });
    expect(parseShareBody({ visibility: "public", rotate: true })).toEqual({
      visibility: "public",
      rotate: true,
    });
  });

  test("rejects anything that isn't a known visibility", () => {
    expect(parseShareBody({ visibility: "PUBLIC" })).toBeNull();
    expect(parseShareBody({ visibility: "foo" })).toBeNull();
    expect(parseShareBody({})).toBeNull();
    expect(parseShareBody(null)).toBeNull();
  });
});

describe("buildShareUpdate", () => {
  test("mints a slug when a private row leaves private", () => {
    const update = buildShareUpdate(
      { shareSlug: null },
      { visibility: "unlisted" },
    );
    expect(update.visibility).toBe("unlisted");
    expect(update.shareSlug).toMatch(/^[23456789a-z]{10}$/);
    expect(update.sharedAt).toBeInstanceOf(Date);
  });

  test("keeps the existing slug when only visibility changes", () => {
    const update = buildShareUpdate(
      { shareSlug: "abcdefghjk" },
      { visibility: "public" },
    );
    expect(update.shareSlug).toBeUndefined();
    expect(update.sharedAt).toBeInstanceOf(Date);
  });

  test("keeps the slug and doesn't re-stamp sharedAt when going private", () => {
    const update = buildShareUpdate(
      { shareSlug: "abcdefghjk" },
      { visibility: "private" },
    );
    expect(update.visibility).toBe("private");
    expect(update.shareSlug).toBeUndefined();
    expect(update.sharedAt).toBeUndefined();
  });

  test("rotate always mints a fresh slug", () => {
    const update = buildShareUpdate(
      { shareSlug: "abcdefghjk" },
      { visibility: "unlisted", rotate: true },
    );
    expect(update.shareSlug).toBeDefined();
    expect(update.shareSlug).not.toBe("abcdefghjk");
  });
});
