"use client";

import { Dex } from "@pkmn/dex";
import { useQuery } from "@tanstack/react-query";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import { getPokemonMoves } from "@/lib/learnsets";
import {
  gens,
  getAbility,
  getAllAbilities,
  getAllItems,
  getAllMoves,
  getAllSpecies,
  getAllTypes,
  getGenerationName,
  getItem,
  getMove,
  getType,
  getTypeMatchups,
  toID,
} from "@/lib/pkmn";
import { pokemonSprite, pokemonSpriteById } from "@/lib/sprites";
import type {
  EvolutionChainLink,
  FullAbilityDetail,
  FullItemDetail,
  FullMoveDetail,
  FullTypeDetail,
  ItemListItem,
  MoveListItem,
  Pokemon,
  PokemonMove,
  PokemonSpecies,
  PokemonType,
  TypeDamageRelations,
  TypeDetail,
  TypeEffectiveness,
} from "@/types/pokemon";

function findSpeciesByNumOrName(nameOrId: string | number) {
  // Use Dex.species directly to include ALL Pokemon forms (Mega, Gmax, etc.)
  // not just those in Gen 9 games
  const allSpecies = Dex.species.all();

  if (typeof nameOrId === "number") {
    // Find by dex number - prefer base form, then any form
    return (
      allSpecies.find((s) => s.num === nameOrId && !s.forme) ??
      allSpecies.find((s) => s.num === nameOrId)
    );
  }

  // Try to get by name/id first
  const byName = Dex.species.get(nameOrId);
  if (byName?.exists) return byName;

  // Try parsing as number
  const asNum = Number.parseInt(nameOrId, 10);
  if (!Number.isNaN(asNum)) {
    return (
      allSpecies.find((s) => s.num === asNum && !s.forme) ??
      allSpecies.find((s) => s.num === asNum)
    );
  }

  return undefined;
}

export function usePokemon(nameOrId: string | number | null) {
  const { defaultPokemonSpriteGen } = useSpritePreferences();

  return useQuery<Pokemon>({
    queryKey: ["pokemon", nameOrId, defaultPokemonSpriteGen],
    queryFn: () => {
      if (nameOrId === null) throw new Error("Pokemon id is required");
      const species = findSpeciesByNumOrName(nameOrId);
      if (!species) throw new Error("Species not found");

      const stats = [
        { name: "HP", value: species.baseStats.hp },
        { name: "Attack", value: species.baseStats.atk },
        { name: "Defense", value: species.baseStats.def },
        { name: "Sp. Atk", value: species.baseStats.spa },
        { name: "Sp. Def", value: species.baseStats.spd },
        { name: "Speed", value: species.baseStats.spe },
      ];

      const abilities = Object.entries(species.abilities)
        .map(([slot, name]) => ({
          name: name as string,
          isHidden: slot === "H",
        }))
        .filter((a) => a.name);

      return {
        id: species.num,
        name: species.name,
        types: species.types as PokemonType[],
        sprite:
          pokemonSprite(species.name, { gen: defaultPokemonSpriteGen }) ||
          pokemonSpriteById(species.num),
        spriteShiny:
          pokemonSprite(species.name, {
            gen: defaultPokemonSpriteGen,
            shiny: true,
          }) || pokemonSpriteById(species.num, { shiny: true }),
        height: 0, // Height not available in @pkmn/dex
        weight: species.weightkg * 10, // Convert kg to decigrams (API format)
        stats,
        abilities,
      };
    },
    enabled: nameOrId !== null,
  });
}

export function usePokemonSpecies(nameOrId: string | number | null) {
  return useQuery<PokemonSpecies>({
    queryKey: ["pokemon-species", nameOrId],
    queryFn: () => {
      if (nameOrId === null) throw new Error("Pokemon id is required");
      const species = findSpeciesByNumOrName(nameOrId);
      if (!species) throw new Error("Species not found");

      // For formes (Mega, Gmax, regional, etc.), use the base species for evolution chain
      // since formes don't have their own evolution data
      const evolutionSpeciesId = species.baseSpecies
        ? toID(species.baseSpecies)
        : species.id;

      return {
        id: species.num,
        name: species.name,
        description: species.desc || "",
        genus: species.forme ? `${species.baseForme || "Base"} Forme` : "",
        // Use the base species id for formes so they show the base form's evolution chain
        evolutionChainUrl: `evo-${evolutionSpeciesId}`,
        generation: getGenerationName(species.gen),
        genderRate:
          species.genderRatio?.F !== undefined
            ? Math.round(species.genderRatio.F * 8)
            : species.gender === "N"
              ? -1
              : 4,
        captureRate: 45, // Not available in @pkmn/dex
        baseHappiness: 50, // Not available in @pkmn/dex
        hatchCounter: species.eggGroups?.includes("Undiscovered") ? 120 : 20,
        growthRate: "Medium Fast", // Not available in @pkmn/dex
        eggGroups: species.eggGroups || [],
        evYield: [], // Not available in @pkmn/dex
      };
    },
    enabled: nameOrId !== null,
  });
}

export function usePokemonWithSpecies(nameOrId: string | number | null) {
  const pokemon = usePokemon(nameOrId);
  const species = usePokemonSpecies(nameOrId);

  return {
    pokemon: pokemon.data,
    species: species.data,
    isLoading: pokemon.isLoading || species.isLoading,
    error: pokemon.error || species.error,
  };
}

export function usePokemonMoves(nameOrId: string | number | null) {
  return useQuery<PokemonMove[]>({
    queryKey: ["pokemon-moves", nameOrId],
    queryFn: async () => {
      if (nameOrId === null) throw new Error("Pokemon id is required");
      const species = findSpeciesByNumOrName(nameOrId);
      if (!species) throw new Error("Species not found");

      // Try to get moves for the exact species first
      let moves = await getPokemonMoves(species.name);

      // If no moves found and this is a forme (Mega, Gmax, regional, etc.),
      // fall back to the base species' learnset
      if (moves.length === 0 && species.baseSpecies) {
        moves = await getPokemonMoves(species.baseSpecies);
      }

      return moves.map((m) => ({
        name: m.name,
        type: m.type as PokemonType,
        power: m.power,
        accuracy: m.accuracy,
        pp: m.pp,
        damageClass: m.category as "Physical" | "Special" | "Status",
        learnMethod: m.learnMethod,
        levelLearnedAt: m.levelLearnedAt,
        description: m.description,
        priority: m.priority,
        target: m.target,
      }));
    },
    enabled: nameOrId !== null,
    staleTime: 1000 * 60 * 60,
  });
}

export function useEvolutionChain(evolutionChainUrl: string | null) {
  const { defaultPokemonSpriteGen } = useSpritePreferences();

  return useQuery<EvolutionChainLink>({
    queryKey: ["evolution-chain", evolutionChainUrl, defaultPokemonSpriteGen],
    queryFn: () => {
      if (!evolutionChainUrl) throw new Error("No evolution chain");

      const startId = evolutionChainUrl.replace("evo-", "");
      const startSpecies = gens.get(9).species.get(startId);
      if (!startSpecies) throw new Error("Species not found");

      function buildChain(
        speciesId: string,
        evolutionDetails: EvolutionChainLink["evolutionDetails"] = [],
      ): EvolutionChainLink {
        const sp = gens.get(9).species.get(speciesId);
        if (!sp) throw new Error(`Species ${speciesId} not found`);

        const evolutions: EvolutionChainLink[] = [];
        for (const otherSpecies of getAllSpecies(9, { includeFormes: true })) {
          if (otherSpecies.prevo && toID(otherSpecies.prevo) === sp.id) {
            const evoDetails: EvolutionChainLink["evolutionDetails"] = [];

            if (otherSpecies.evoLevel) {
              evoDetails.push({
                trigger: "Level Up",
                minLevel: otherSpecies.evoLevel,
                item: null,
                heldItem: null,
                timeOfDay: null,
                minHappiness: null,
                knownMove: null,
                location: null,
                otherRequirement: null,
              });
            } else if (otherSpecies.evoItem) {
              evoDetails.push({
                trigger: "Use Item",
                minLevel: null,
                item: otherSpecies.evoItem,
                heldItem: null,
                timeOfDay: null,
                minHappiness: null,
                knownMove: null,
                location: null,
                otherRequirement: null,
              });
            } else if (otherSpecies.evoMove) {
              evoDetails.push({
                trigger: "Level Up",
                minLevel: null,
                item: null,
                heldItem: null,
                timeOfDay: null,
                minHappiness: null,
                knownMove: otherSpecies.evoMove,
                location: null,
                otherRequirement: null,
              });
            } else if (otherSpecies.evoCondition) {
              evoDetails.push({
                trigger: otherSpecies.evoCondition,
                minLevel: null,
                item: null,
                heldItem: null,
                timeOfDay: null,
                minHappiness: null,
                knownMove: null,
                location: null,
                otherRequirement: otherSpecies.evoCondition,
              });
            } else {
              evoDetails.push({
                trigger: "Trade",
                minLevel: null,
                item: null,
                heldItem: null,
                timeOfDay: null,
                minHappiness: null,
                knownMove: null,
                location: null,
                otherRequirement: null,
              });
            }

            evolutions.push(buildChain(otherSpecies.id, evoDetails));
          }
        }

        return {
          id: sp.num,
          name: sp.name,
          sprite:
            pokemonSprite(sp.name, { gen: defaultPokemonSpriteGen }) ||
            pokemonSpriteById(sp.num),
          evolvesTo: evolutions,
          evolutionDetails,
        };
      }

      let baseSpecies = startSpecies;
      while (baseSpecies.prevo) {
        const prev =
          gens.get(9).species.get(toID(baseSpecies.prevo)) ??
          gens.get(9).species.get(baseSpecies.prevo);
        if (prev) baseSpecies = prev;
        else break;
      }

      return buildChain(baseSpecies.id);
    },
    enabled: evolutionChainUrl !== null,
    staleTime: 1000 * 60 * 60,
  });
}

export function useAllPokemonNames() {
  return useQuery({
    queryKey: ["all-pokemon-names"],
    queryFn: () => {
      return getAllSpecies().map((s) => ({
        name: s.name,
        id: s.num,
        sprite: pokemonSpriteById(s.num),
      }));
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useAllMoveNames() {
  return useQuery({
    queryKey: ["all-move-names"],
    queryFn: () => {
      return getAllMoves().map((m) => ({
        name: m.name,
        id: m.num,
      }));
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useAllAbilityNames() {
  return useQuery({
    queryKey: ["all-ability-names"],
    queryFn: () => {
      return getAllAbilities().map((a) => ({
        name: a.name,
        id: a.num,
      }));
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useAllItemNames() {
  return useQuery({
    queryKey: ["all-item-names"],
    queryFn: () => {
      return getAllItems().map((i) => ({
        name: i.name,
        id: i.num,
        sprite: `https://play.pokemonshowdown.com/sprites/itemicons/${toID(i.name)}.png`,
      }));
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useMoveList() {
  return useQuery({
    queryKey: ["move-list"],
    queryFn: () => {
      const moves = getAllMoves().map(
        (m): MoveListItem => ({
          id: m.num,
          name: m.name,
          type: m.type as PokemonType,
          damageClass: m.category as "Physical" | "Special" | "Status",
          power: m.basePower || null,
          accuracy: m.accuracy === true ? null : m.accuracy,
          pp: m.pp,
          generation: getGenerationName(m.gen),
        }),
      );
      return { moves, count: moves.length };
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useFullMoveDetail(name: string | null) {
  return useQuery<FullMoveDetail>({
    queryKey: ["move-detail", name],
    queryFn: () => {
      if (!name) throw new Error("Move name is required");
      const move = getMove(name);
      if (!move) throw new Error("Move not found");

      const pokemon: FullMoveDetail["pokemon"] = [];
      for (const species of getAllSpecies()) {
        pokemon.push({
          id: species.num,
          name: species.name,
          sprite: pokemonSpriteById(species.num),
          learnMethods: [],
        });
      }

      return {
        id: move.num,
        name: move.name,
        type: move.type as PokemonType,
        damageClass: move.category as "Physical" | "Special" | "Status",
        power: move.basePower || null,
        accuracy: move.accuracy === true ? null : move.accuracy,
        pp: move.pp,
        priority: move.priority,
        description: move.desc || move.shortDesc || "",
        effectChance: move.secondary?.chance || null,
        target: move.target,
        generation: getGenerationName(move.gen),
        pokemon: pokemon.slice(0, 50),
      };
    },
    enabled: name !== null,
    staleTime: 1000 * 60 * 60,
  });
}

export function useFullAbilityDetail(name: string | null) {
  return useQuery<FullAbilityDetail>({
    queryKey: ["ability-detail", name],
    queryFn: () => {
      if (!name) throw new Error("Ability name is required");
      const ability = getAbility(name);
      if (!ability) throw new Error("Ability not found");

      const pokemon: FullAbilityDetail["pokemon"] = [];
      for (const species of getAllSpecies()) {
        const abilities = Object.entries(species.abilities);
        for (const [slot, abilityName] of abilities) {
          if (toID(abilityName as string) === ability.id) {
            pokemon.push({
              id: species.num,
              name: species.name,
              sprite: pokemonSpriteById(species.num),
              isHidden: slot === "H",
            });
            break;
          }
        }
      }

      return {
        id: ability.num,
        name: ability.name,
        description: ability.desc || "",
        shortDescription: ability.shortDesc || "",
        generation: getGenerationName(ability.gen),
        isMainSeries: true,
        pokemon,
      };
    },
    enabled: name !== null,
    staleTime: 1000 * 60 * 60,
  });
}

export function useAllTypes() {
  return useQuery<TypeDetail[]>({
    queryKey: ["all-types"],
    queryFn: () => {
      const gen = gens.get(9);
      return getAllTypes().map((type, idx) => {
        const damageRelations: TypeDamageRelations = {
          doubleDamageTo: [],
          halfDamageTo: [],
          noDamageTo: [],
          doubleDamageFrom: [],
          halfDamageFrom: [],
          noDamageFrom: [],
        };

        for (const otherType of getAllTypes()) {
          const effOffense =
            gen.types.get(type.name)?.totalEffectiveness(otherType.name) ?? 1;
          const effDefense =
            gen.types.get(otherType.name)?.totalEffectiveness(type.name) ?? 1;

          if (effOffense > 1)
            damageRelations.doubleDamageTo.push(otherType.name as PokemonType);
          else if (effOffense > 0 && effOffense < 1)
            damageRelations.halfDamageTo.push(otherType.name as PokemonType);
          else if (effOffense === 0)
            damageRelations.noDamageTo.push(otherType.name as PokemonType);

          if (effDefense > 1)
            damageRelations.doubleDamageFrom.push(
              otherType.name as PokemonType,
            );
          else if (effDefense > 0 && effDefense < 1)
            damageRelations.halfDamageFrom.push(otherType.name as PokemonType);
          else if (effDefense === 0)
            damageRelations.noDamageFrom.push(otherType.name as PokemonType);
        }

        return {
          id: idx + 1,
          name: type.name as PokemonType,
          damageRelations,
          generation: "Gen I",
        };
      });
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useFullTypeDetail(name: string | null) {
  return useQuery<FullTypeDetail>({
    queryKey: ["type-detail", name],
    queryFn: () => {
      if (!name) throw new Error("Type name is required");
      const type = getType(name);
      if (!type) throw new Error("Type not found");

      const gen = gens.get(9);
      const damageRelations: TypeDamageRelations = {
        doubleDamageTo: [],
        halfDamageTo: [],
        noDamageTo: [],
        doubleDamageFrom: [],
        halfDamageFrom: [],
        noDamageFrom: [],
      };

      for (const otherType of getAllTypes()) {
        const effOffense = type.totalEffectiveness(otherType.name);
        const effDefense =
          gen.types.get(otherType.name)?.totalEffectiveness(type.name) ?? 1;

        if (effOffense > 1)
          damageRelations.doubleDamageTo.push(otherType.name as PokemonType);
        else if (effOffense > 0 && effOffense < 1)
          damageRelations.halfDamageTo.push(otherType.name as PokemonType);
        else if (effOffense === 0)
          damageRelations.noDamageTo.push(otherType.name as PokemonType);

        if (effDefense > 1)
          damageRelations.doubleDamageFrom.push(otherType.name as PokemonType);
        else if (effDefense > 0 && effDefense < 1)
          damageRelations.halfDamageFrom.push(otherType.name as PokemonType);
        else if (effDefense === 0)
          damageRelations.noDamageFrom.push(otherType.name as PokemonType);
      }

      const pokemon: FullTypeDetail["pokemon"] = [];
      for (const species of getAllSpecies()) {
        const typeIndex = species.types.indexOf(type.name);
        if (typeIndex !== -1) {
          pokemon.push({
            id: species.num,
            name: species.name,
            sprite: pokemonSpriteById(species.num),
            slot: (typeIndex + 1) as 1 | 2,
          });
        }
      }

      return {
        id: 1,
        name: type.name as PokemonType,
        damageRelations,
        generation: "Gen I",
        pokemon: pokemon.sort((a, b) => a.id - b.id),
      };
    },
    enabled: name !== null,
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useItemList() {
  return useQuery({
    queryKey: ["item-list"],
    queryFn: () => {
      const items = getAllItems().map(
        (i): ItemListItem => ({
          id: i.num,
          name: i.name,
          sprite: `https://play.pokemonshowdown.com/sprites/itemicons/${toID(i.name)}.png`,
          category: i.fling?.basePower ? "Fling" : "General",
          pocket: "misc",
          cost: 0,
        }),
      );
      return { items, count: items.length };
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useFullItemDetail(name: string | null) {
  return useQuery<FullItemDetail>({
    queryKey: ["item-detail", name],
    queryFn: () => {
      if (!name) throw new Error("Item name is required");
      const item = getItem(name);
      if (!item) throw new Error("Item not found");

      return {
        id: item.num,
        name: item.name,
        sprite: `https://play.pokemonshowdown.com/sprites/itemicons/${toID(item.name)}.png`,
        category: item.fling?.basePower ? "Fling" : "General",
        pocket: "misc",
        cost: 0,
        flingPower: item.fling?.basePower || null,
        flingEffect: null,
        description: item.desc || "",
        shortDescription: item.shortDesc || "",
        attributes: [],
        heldByPokemon: [],
        gameIndices: [],
      };
    },
    enabled: name !== null,
    staleTime: 1000 * 60 * 60,
  });
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
): TypeEffectiveness {
  const matchups = getTypeMatchups(types);
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
