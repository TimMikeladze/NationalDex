"use client";

import { useQuery } from "@tanstack/react-query";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import { getTypeMatchups, LATEST_GEN } from "@/lib/pkmn";
import {
  type FormattedPokemonEncounter,
  getAllRegions,
  getFormattedPokemonEncounters,
  getLocation,
  getLocationArea,
  type PokeAPILocation,
  type PokeAPILocationArea,
  type RegionWithLocations,
} from "@/lib/pokeapi";
import {
  abilityDetailQuery,
  allAbilityNamesQuery,
  allItemNamesQuery,
  allMoveNamesQuery,
  allPokemonNamesQuery,
  allTypesQuery,
  evolutionChainQuery,
  itemDetailQuery,
  itemListQuery,
  moveDetailQuery,
  moveListQuery,
  pokemonMovesQuery,
  pokemonQuery,
  pokemonSpeciesQuery,
  typeDetailQuery,
} from "@/lib/queries";
import type { PokemonType, TypeEffectiveness } from "@/types/pokemon";

// The query definitions themselves live in `@/lib/queries` so server components
// can prefetch the exact same keys and the page arrives pre-rendered rather than
// as a loading skeleton. These hooks only supply the client-side preferences.

/**
 * @param genNum View the Pokemon as it was in this generation's games (base
 * stats, types and abilities all changed over time). Null shows the latest data.
 */
export function usePokemon(
  nameOrId: string | number | null,
  genNum: number | null = null,
) {
  const { defaultPokemonSpriteGen } = useSpritePreferences();
  return useQuery(pokemonQuery(nameOrId, defaultPokemonSpriteGen, genNum));
}

/**
 * @param genNum Breeding and gender data as of this generation's games. Gen I
 * had neither, so both come back empty there.
 */
export function usePokemonSpecies(
  nameOrId: string | number | null,
  genNum: number | null = null,
) {
  return useQuery(pokemonSpeciesQuery(nameOrId, genNum));
}

export function usePokemonWithSpecies(
  nameOrId: string | number | null,
  genNum: number | null = null,
) {
  const pokemon = usePokemon(nameOrId, genNum);
  const species = usePokemonSpecies(nameOrId, genNum);

  return {
    pokemon: pokemon.data,
    species: species.data,
    isLoading: pokemon.isLoading || species.isLoading,
    error: pokemon.error || species.error,
  };
}

/**
 * @param genNum Only include moves learnable in this generation's games, with
 * that generation's move data. Null shows the most recent learnset instead.
 */
export function usePokemonMoves(
  nameOrId: string | number | null,
  genNum: number | null = null,
) {
  return useQuery(pokemonMovesQuery(nameOrId, genNum));
}

/**
 * @param genNum Limit the chain to Pokemon that existed in this generation's
 * games, e.g. Eevee has no Sylveon before Gen VI. Null includes every stage.
 */
export function useEvolutionChain(
  evolutionChainUrl: string | null,
  genNum: number | null = null,
) {
  const { defaultPokemonSpriteGen } = useSpritePreferences();
  return useQuery(
    evolutionChainQuery(evolutionChainUrl, defaultPokemonSpriteGen, genNum),
  );
}

export function useAllPokemonNames(genNum: number | null = null) {
  return useQuery(allPokemonNamesQuery(genNum));
}

export function useAllMoveNames(genNum: number | null = null) {
  return useQuery(allMoveNamesQuery(genNum));
}

export function useAllAbilityNames(genNum: number | null = null) {
  return useQuery(allAbilityNamesQuery(genNum));
}

export function useAllItemNames(genNum: number | null = null) {
  return useQuery(allItemNamesQuery(genNum));
}

export function useMoveList(genNum: number | null = null) {
  return useQuery(moveListQuery(genNum));
}

/**
 * @param genNum Read the move as it was in this generation's games — power,
 * accuracy, type and category all changed over time — and list only the Pokemon
 * that learn it there. Null uses the latest data across the National Dex.
 */
export function useFullMoveDetail(
  name: string | null,
  genNum: number | null = null,
) {
  const { defaultPokemonSpriteGen } = useSpritePreferences();
  return useQuery(moveDetailQuery(name, genNum, defaultPokemonSpriteGen));
}

/**
 * @param genNum Read the ability as it was in this generation's games and list
 * only the Pokemon that had it then. Null uses the latest data.
 */
export function useFullAbilityDetail(
  name: string | null,
  genNum: number | null = null,
) {
  const { defaultPokemonSpriteGen } = useSpritePreferences();
  return useQuery(abilityDetailQuery(name, genNum, defaultPokemonSpriteGen));
}

/**
 * @param genNum Damage relations as of this generation's games — the chart
 * changed in Gen II (Dark/Steel, Ghost hitting Psychic) and Gen VI (Fairy,
 * Steel losing its Ghost/Dark resistances). Null uses the latest chart.
 */
export function useAllTypes(genNum: number | null = null) {
  return useQuery(allTypesQuery(genNum));
}

/**
 * @param genNum Damage relations and Pokemon list as of this generation's
 * games, or null for the latest data.
 */
export function useFullTypeDetail(
  name: string | null,
  genNum: number | null = null,
) {
  const { defaultPokemonSpriteGen } = useSpritePreferences();
  return useQuery(typeDetailQuery(name, genNum, defaultPokemonSpriteGen));
}

export function useItemList(genNum: number | null = null) {
  return useQuery(itemListQuery(genNum));
}

/**
 * @param genNum Read the item as it was in this generation's games, or null for
 * the latest data.
 */
export function useFullItemDetail(
  name: string | null,
  genNum: number | null = null,
) {
  return useQuery(itemDetailQuery(name, genNum));
}

export function useItemCategories() {
  return useQuery({
    queryKey: ["item-categories"],
    queryFn: () => {
      return [
        { id: "misc", name: "Misc", pocket: "misc" as const },
        { id: "medicine", name: "Medicine", pocket: "medicine" as const },
        { id: "pokeballs", name: "Poke Balls", pocket: "pokeballs" as const },
        { id: "machines", name: "TMs & HMs", pocket: "machines" as const },
        { id: "berries", name: "Berries", pocket: "berries" as const },
        { id: "battle", name: "Battle Items", pocket: "battle" as const },
        { id: "key", name: "Key Items", pocket: "key" as const },
      ];
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function calculateTypeEffectiveness(
  types: PokemonType[],
  genNum: number = LATEST_GEN,
): TypeEffectiveness {
  const matchups = getTypeMatchups(types, genNum);
  return {
    weaknesses: matchups.weaknesses.map((w) => ({
      type: w.type as PokemonType,
      multiplier: w.multiplier,
    })),
    resistances: matchups.resistances.map((r) => ({
      type: r.type as PokemonType,
      multiplier: r.multiplier,
    })),
    immunities: matchups.immunities as PokemonType[],
  };
}

export function getPokemonIdFromUrl(url: string): number {
  const match = url.match(/\/pokemon\/(\d+)\//);
  return match ? Number.parseInt(match[1], 10) : 0;
}

// =============================================================================
// Location Hooks
// =============================================================================

export function useAllRegions() {
  return useQuery<RegionWithLocations[]>({
    queryKey: ["all-regions"],
    queryFn: getAllRegions,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function usePokemonEncounters(pokemonId: number | string | null) {
  return useQuery<FormattedPokemonEncounter[]>({
    queryKey: ["pokemon-encounters", pokemonId],
    queryFn: () => {
      if (!pokemonId) throw new Error("Pokemon ID is required");
      return getFormattedPokemonEncounters(pokemonId);
    },
    enabled: pokemonId !== null,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useLocation(name: string) {
  return useQuery<PokeAPILocation | null>({
    queryKey: ["location", name],
    queryFn: () => getLocation(name),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useLocationAreas(areaNames: string[]) {
  return useQuery<PokeAPILocationArea[]>({
    queryKey: ["location-areas", areaNames],
    queryFn: async () => {
      const results = await Promise.all(
        areaNames.map((name) => getLocationArea(name)),
      );
      return results.filter((a): a is PokeAPILocationArea => a !== null);
    },
    enabled: areaNames.length > 0,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
