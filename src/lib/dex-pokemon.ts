import { getAllSpecies, toID } from "@/lib/pkmn";
import { pokemonSprite } from "@/lib/sprites";
import type { PokemonType } from "@/types/pokemon";

export type DexPokemonFormsMode = "none" | "distinct-sprites" | "all";

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

  const baseName = base.name;

  // Base first, then every other forme (alphabetical by name)
  const sorted = [
    base,
    ...all
      .filter((s) => s !== base)
      .sort((a, b) => a.name.localeCompare(b.name)),
  ];

  return sorted.map((s) => ({
    id: s.num,
    name: s.name,
    slug: toID(s.name),
    types: s.types as PokemonType[],
    isForm: Boolean(s.forme),
    baseId: base.num,
    baseName,
  }));
}

export function getDexPokemonList(
  genNum = 9,
  options?: {
    forms?: DexPokemonFormsMode;
  },
): DexPokemonListItem[] {
  const formsMode = options?.forms ?? "distinct-sprites";

  // Include formes so we can decide which ones to render.
  const all = getAllSpecies(genNum, { includeFormes: true });

  const groups = new Map<
    number,
    {
      base?: (typeof all)[number];
      forms: (typeof all)[number][];
    }
  >();

  for (const s of all) {
    const g = groups.get(s.num) ?? { forms: [] as (typeof all)[number][] };
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

    const baseName = base.name;
    const baseSprite = pokemonSprite(baseName);

    result.push({
      id: base.num,
      name: baseName,
      slug: toID(baseName),
      types: base.types as PokemonType[],
      isForm: Boolean(base.forme),
      baseId: base.num,
      baseName,
    });

    if (formsMode === "none") continue;

    for (const form of group.forms) {
      // Skip certain nonstandard forms that shouldn't appear in the main list
      const skipNonstandard = ["Future", "CAP", "LGPE"];
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

      result.push({
        id: form.num,
        name: form.name,
        slug: toID(form.name),
        types: form.types as PokemonType[],
        isForm: true,
        baseId: base.num,
        baseName,
      });
    }
  }

  return result;
}
