import {
  LEGACY_PREFERENCE_KEYS,
  SYNCED_STORAGE_KEYS,
} from "@/lib/sync/storage-keys";

/**
 * The preferences record kept under the single `pokedex-preferences` key
 * (mirroring the one-row-per-user `preferences` table), and the pure
 * functions that read, parse and migrate it. No React here so it can be
 * unit-tested against a bare `localStorage`.
 */

export type ContentWidth = "contained" | "full";

export interface PreferencesData {
  spriteSetOverride: string | null;
  preferredGeneration: number | null;
  preferredGameVersion: string | null;
  contentWidth: ContentWidth;
}

export const DEFAULT_PREFERENCES: PreferencesData = {
  spriteSetOverride: null,
  preferredGeneration: null,
  preferredGameVersion: null,
  contentWidth: "contained",
};

export function isDefaultPreferences(value: PreferencesData): boolean {
  return (
    value.spriteSetOverride === null &&
    value.preferredGeneration === null &&
    value.preferredGameVersion === null &&
    value.contentWidth === "contained"
  );
}

/** One field of a legacy per-hook record: `{ [field]: value }` stored as JSON under `key`. */
function readLegacyField<T>(
  key: string,
  field: string,
  isValue: (value: unknown) => value is T,
): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const value = parsed?.[field];
    return isValue(value) ? value : null;
  } catch {
    return null;
  }
}

const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number";

function readLegacyContentWidth(): ContentWidth {
  return localStorage.getItem(LEGACY_PREFERENCE_KEYS.contentWidth) === "full"
    ? "full"
    : "contained";
}

/**
 * One-time migration from the four legacy per-hook localStorage keys onto the
 * single consolidated `pokedex-preferences` key. No-op if the new key is
 * already present, or if none of the legacy keys have anything stored. The
 * legacy keys are left in place as harmless orphans. Also used by the backup
 * importer, which restores pre-v2 backups into the legacy keys and then runs
 * this to consolidate them.
 */
export function migrateLegacyPreferences(): void {
  try {
    if (localStorage.getItem(SYNCED_STORAGE_KEYS.preferences) !== null) return;

    const hasLegacyData = Object.values(LEGACY_PREFERENCE_KEYS).some(
      (key) => localStorage.getItem(key) !== null,
    );
    if (!hasLegacyData) return;

    const migrated: PreferencesData = {
      spriteSetOverride: readLegacyField(
        LEGACY_PREFERENCE_KEYS.sprite,
        "spriteSetOverride",
        isString,
      ),
      preferredGeneration: readLegacyField(
        LEGACY_PREFERENCE_KEYS.generation,
        "preferredGeneration",
        isNumber,
      ),
      preferredGameVersion: readLegacyField(
        LEGACY_PREFERENCE_KEYS.game,
        "preferredGameVersion",
        isString,
      ),
      contentWidth: readLegacyContentWidth(),
    };
    localStorage.setItem(
      SYNCED_STORAGE_KEYS.preferences,
      JSON.stringify(migrated),
    );
  } catch {
    // Storage unavailable — fall through to defaults, same as any other hook.
  }
}

/** Parses a stored preferences record, field by field, falling back per field. */
export function parseStoredPreferences(raw: string | null): PreferencesData {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as Partial<PreferencesData>;
    return {
      spriteSetOverride: isString(parsed.spriteSetOverride)
        ? parsed.spriteSetOverride
        : null,
      preferredGeneration: isNumber(parsed.preferredGeneration)
        ? parsed.preferredGeneration
        : null,
      preferredGameVersion: isString(parsed.preferredGameVersion)
        ? parsed.preferredGameVersion
        : null,
      contentWidth: parsed.contentWidth === "full" ? "full" : "contained",
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
