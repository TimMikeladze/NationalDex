import { beforeEach, describe, expect, test } from "bun:test";
import {
  LEGACY_PREFERENCE_KEYS,
  SYNCED_STORAGE_KEYS,
} from "@/lib/sync/storage-keys";

// A bare `localStorage` is all these functions touch.
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  },
  configurable: true,
  writable: true,
});

const {
  DEFAULT_PREFERENCES,
  migrateLegacyPreferences,
  parseStoredPreferences,
} = await import("./preferences");

const NEW_KEY = SYNCED_STORAGE_KEYS.preferences;

beforeEach(() => {
  storage.clear();
});

describe("migrateLegacyPreferences", () => {
  test("folds all four legacy keys into one record", () => {
    storage.set(
      LEGACY_PREFERENCE_KEYS.sprite,
      JSON.stringify({ spriteSetOverride: "gen5" }),
    );
    storage.set(
      LEGACY_PREFERENCE_KEYS.generation,
      JSON.stringify({ preferredGeneration: 3 }),
    );
    storage.set(
      LEGACY_PREFERENCE_KEYS.game,
      JSON.stringify({ preferredGameVersion: "emerald" }),
    );
    storage.set(LEGACY_PREFERENCE_KEYS.contentWidth, "full");

    migrateLegacyPreferences();

    expect(parseStoredPreferences(storage.get(NEW_KEY) ?? null)).toEqual({
      spriteSetOverride: "gen5",
      preferredGeneration: 3,
      preferredGameVersion: "emerald",
      contentWidth: "full",
    });
  });

  test("does nothing when there is no legacy data", () => {
    migrateLegacyPreferences();
    expect(storage.has(NEW_KEY)).toBe(false);
  });

  test("leaves an existing consolidated record alone", () => {
    const existing = JSON.stringify({
      ...DEFAULT_PREFERENCES,
      preferredGeneration: 7,
    });
    storage.set(NEW_KEY, existing);
    storage.set(
      LEGACY_PREFERENCE_KEYS.generation,
      JSON.stringify({ preferredGeneration: 1 }),
    );

    migrateLegacyPreferences();

    expect(storage.get(NEW_KEY)).toBe(existing);
  });

  test("falls back per field when a legacy value is malformed", () => {
    storage.set(LEGACY_PREFERENCE_KEYS.sprite, "{not json");
    storage.set(
      LEGACY_PREFERENCE_KEYS.generation,
      JSON.stringify({ preferredGeneration: "four" }),
    );
    storage.set(
      LEGACY_PREFERENCE_KEYS.game,
      JSON.stringify({ preferredGameVersion: "ruby" }),
    );

    migrateLegacyPreferences();

    expect(parseStoredPreferences(storage.get(NEW_KEY) ?? null)).toEqual({
      spriteSetOverride: null,
      preferredGeneration: null,
      preferredGameVersion: "ruby",
      contentWidth: "contained",
    });
  });
});

describe("parseStoredPreferences", () => {
  test("returns the defaults for nothing stored or unparseable JSON", () => {
    expect(parseStoredPreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parseStoredPreferences("nope")).toEqual(DEFAULT_PREFERENCES);
  });

  test("keeps well-typed fields and drops the rest", () => {
    expect(
      parseStoredPreferences(
        JSON.stringify({
          spriteSetOverride: 5,
          preferredGeneration: 2,
          contentWidth: "wide",
        }),
      ),
    ).toEqual({
      spriteSetOverride: null,
      preferredGeneration: 2,
      preferredGameVersion: null,
      contentWidth: "contained",
    });
  });
});
