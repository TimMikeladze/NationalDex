import regulationData from "@/data/regulations.json";
import { getAllSpecies, toID } from "@/lib/pkmn";
import { pokemonSprite } from "@/lib/sprites";
import type { PokemonType } from "@/types/pokemon";

export interface Regulation {
  id: string;
  name: string;
}

/**
 * Current competitive regulations, generated from @pkmn/sim's format rulesets
 * by scripts/generate-regulations.ts.
 */
export const REGULATIONS: Regulation[] = regulationData.regulations;

const LEGAL_MASKS: Record<string, number> = regulationData.legal;
const RESTRICTED_MASKS: Record<string, number> = regulationData.restricted;

/** Bit each regulation occupies in the generated masks. */
const REGULATION_BITS = new Map(
  REGULATIONS.map((regulation, index) => [regulation.id, 1 << index]),
);

/** Bitmask of every regulation the given Pokemon slug is legal in. */
export function getRegulationMask(slug: string): number {
  return LEGAL_MASKS[slug] ?? 0;
}

/** Bitmask of the given regulation ids, for testing against a Pokemon's mask. */
export function toRegulationMask(regulationIds: string[]): number {
  let mask = 0;
  for (const id of regulationIds) mask |= REGULATION_BITS.get(id) ?? 0;
  return mask;
}

export type DexPokemonFormsMode = "none" | "distinct-sprites" | "all";

export const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
/** Stat keys usable for sorting/range filtering, including the total. */
export const RANGE_STAT_KEYS = [...STAT_KEYS, "bst"] as const;
export type RangeStatKey = (typeof RANGE_STAT_KEYS)[number];

export const STAT_LABELS: Record<RangeStatKey, string> = {
  hp: "HP",
  atk: "Attack",
  def: "Defense",
  spa: "Sp. Atk",
  spd: "Sp. Def",
  spe: "Speed",
  bst: "Total",
};

/**
 * Baby Pokemon. @pkmn/dex has no `isBaby` flag (its `canHatch` marks every
 * breedable base stage), so the canonical list is kept here.
 */
const BABY_SPECIES = new Set([
  "pichu",
  "cleffa",
  "igglybuff",
  "togepi",
  "tyrogue",
  "smoochum",
  "elekid",
  "magby",
  "azurill",
  "wynaut",
  "budew",
  "chingling",
  "bonsly",
  "mimejr",
  "happiny",
  "munchlax",
  "riolu",
  "mantyke",
  "toxel",
]);

export interface DexPokemonListItem {
  /** National Dex number (forms may share the same number) */
  id: number;
  /** Display name (includes form suffix, e.g. "Raichu-Alola") */
  name: string;
  /** URL-safe id for routing (e.g. "raichualola") */
  slug: string;
  types: PokemonType[];
  /** Whether this entry is a non-base forme */
  isForm: boolean;
  /** Base dex number this entry belongs to */
  baseId: number;
  /** Base name this entry belongs to */
  baseName: string;
  /** Base stats plus their total, used for stat filters and sorting */
  stats: Record<RangeStatKey, number>;
  /** Ability names (regular + hidden), used for ability search */
  abilities: string[];
  isBaby: boolean;
  isLegendary: boolean;
  isMythical: boolean;
  isParadox: boolean;
  isUltraBeast: boolean;
  isMega: boolean;
  isFullyEvolved: boolean;
  /** Bitmask of regulations this Pokemon is legal in (see REGULATIONS) */
  regulationMask: number;
  /** Counts against the restricted-Pokemon limit in at least one regulation */
  isRestricted: boolean;
}

type DexSpecies = ReturnType<typeof getAllSpecies>[number];

function toListItem(
  species: DexSpecies,
  base: DexSpecies,
  isForm: boolean,
): DexPokemonListItem {
  const s = species.baseStats;
  const tags = species.tags ?? [];
  const forme = species.forme ?? "";
  const slug = toID(species.name);

  return {
    id: species.num,
    name: species.name,
    slug,
    types: species.types as PokemonType[],
    isForm,
    baseId: base.num,
    baseName: base.name,
    stats: {
      hp: s.hp,
      atk: s.atk,
      def: s.def,
      spa: s.spa,
      spd: s.spd,
      spe: s.spe,
      bst: s.hp + s.atk + s.def + s.spa + s.spd + s.spe,
    },
    abilities: Object.values(species.abilities).filter(
      (a): a is string => typeof a === "string" && a.length > 0,
    ),
    isBaby: BABY_SPECIES.has(toID(base.name)),
    isLegendary:
      tags.includes("Sub-Legendary") || tags.includes("Restricted Legendary"),
    isMythical: tags.includes("Mythical"),
    isParadox: tags.includes("Paradox"),
    isUltraBeast: tags.includes("Ultra Beast"),
    isMega: Boolean(species.isMega) || forme.startsWith("Mega"),
    isFullyEvolved: !species.nfe,
    regulationMask: getRegulationMask(slug),
    isRestricted: (RESTRICTED_MASKS[slug] ?? 0) !== 0,
  };
}

export function getDexPokemonVariationsByDexNumber(
  genNum = 9,
  dexNumber: number,
): DexPokemonListItem[] {
  const all = getAllSpecies(genNum, { includeFormes: true }).filter(
    (s) => s.num === dexNumber,
  );
  const base = all.find((s) => !s.forme) ?? all[0];
  if (!base) return [];

  // Base first, then every other forme (alphabetical by name)
  const sorted = [
    base,
    ...all
      .filter((s) => s !== base)
      .sort((a, b) => a.name.localeCompare(b.name)),
  ];

  return sorted.map((s) => toListItem(s, base, Boolean(s.forme)));
}

const dexListCache = new Map<string, DexPokemonListItem[]>();

export function getDexPokemonList(
  genNum = 9,
  options?: {
    forms?: DexPokemonFormsMode;
  },
): DexPokemonListItem[] {
  const formsMode = options?.forms ?? "distinct-sprites";
  const cacheKey = `${genNum}|${formsMode}`;
  const cached = dexListCache.get(cacheKey);
  if (cached) return cached;

  // Include formes so we can decide which ones to render.
  const all = getAllSpecies(genNum, { includeFormes: true });

  const groups = new Map<
    number,
    {
      base?: DexSpecies;
      forms: DexSpecies[];
    }
  >();

  for (const s of all) {
    const g = groups.get(s.num) ?? { forms: [] as DexSpecies[] };
    if (s.forme) g.forms.push(s);
    else g.base = s;
    groups.set(s.num, g);
  }

  const nums = Array.from(groups.keys()).sort((a, b) => a - b);
  const result: DexPokemonListItem[] = [];

  for (const num of nums) {
    const group = groups.get(num);
    if (!group) continue;

    const base = group.base ?? group.forms[0];
    if (!base) continue;

    const baseSprite = pokemonSprite(base.name);

    result.push(toListItem(base, base, Boolean(base.forme)));

    if (formsMode === "none") continue;

    for (const form of group.forms) {
      // Skip certain nonstandard forms that shouldn't appear in the main list.
      // "Future" is intentionally NOT skipped: it is how @pkmn/dex marks the
      // newest Mega forms, which do belong in the dex.
      const skipNonstandard = ["CAP", "LGPE"];
      if (
        form.isNonstandard &&
        skipNonstandard.includes(form.isNonstandard as string)
      )
        continue;

      // Skip Totem and other special battle forms (but include Mega and Gmax)
      const formeLower = form.forme?.toLowerCase() ?? "";
      if (
        formeLower.includes("eternamax") ||
        formeLower.includes("totem") ||
        formeLower === "primal"
      )
        continue;

      const formSprite = pokemonSprite(form.name);
      if (!formSprite) continue;
      if (formsMode === "distinct-sprites" && formSprite === baseSprite)
        continue;

      result.push(toListItem(form, base, true));
    }
  }

  dexListCache.set(cacheKey, result);
  return result;
}

let statBoundsCache: Record<RangeStatKey, [number, number]> | null = null;

/** Min/max of every stat across the dex, used to size the range sliders. */
export function getStatBounds(): Record<RangeStatKey, [number, number]> {
  if (statBoundsCache) return statBoundsCache;

  const bounds = {} as Record<RangeStatKey, [number, number]>;
  for (const key of RANGE_STAT_KEYS) {
    bounds[key] = [Number.POSITIVE_INFINITY, 0];
  }

  for (const p of getDexPokemonList(9, { forms: "distinct-sprites" })) {
    for (const key of RANGE_STAT_KEYS) {
      const value = p.stats[key];
      if (value < bounds[key][0]) bounds[key][0] = value;
      if (value > bounds[key][1]) bounds[key][1] = value;
    }
  }

  for (const key of RANGE_STAT_KEYS) {
    if (!Number.isFinite(bounds[key][0])) bounds[key] = [0, 0];
  }

  statBoundsCache = bounds;
  return bounds;
}
