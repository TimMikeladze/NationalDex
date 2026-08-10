"use client";

import { Dex } from "@pkmn/dex";
import { useQuery } from "@tanstack/react-query";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import { getPokemonMoves, getSpeciesLearningMove } from "@/lib/learnsets";
import {
  COMBINED_SPECIAL_GEN,
  FIRST_BREEDING_GEN,
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
  getSpeciesForView,
  getSpeciesGenerations,
  getSpeciesInGen,
  getType,
  getTypeGenerations,
  getTypeMatchups,
  LATEST_GEN,
  resolveSpecies,
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

// Use Dex.species directly to include ALL Pokemon forms (Mega, Gmax, etc.)
// not just those in Gen 9 games
const findSpeciesByNumOrName = resolveSpecies;

/**
 * Gen I had a single Special stat, so it is shown as one row rather than the
 * identical Sp. Atk / Sp. Def pair @pkmn/dex reports for that generation.
 */
function buildStats(
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  },
  genNum: number,
) {
  if (genNum === COMBINED_SPECIAL_GEN) {
    return [
      { name: "HP", value: baseStats.hp },
      { name: "Attack", value: baseStats.atk },
      { name: "Defense", value: baseStats.def },
      { name: "Special", value: baseStats.spa },
      { name: "Speed", value: baseStats.spe },
    ];
  }

  return [
    { name: "HP", value: baseStats.hp },
    { name: "Attack", value: baseStats.atk },
    { name: "Defense", value: baseStats.def },
    { name: "Sp. Atk", value: baseStats.spa },
    { name: "Sp. Def", value: baseStats.spd },
    { name: "Speed", value: baseStats.spe },
  ];
}

/**
 * @param genNum View the Pokemon as it was in this generation's games (base
 * stats, types and abilities all changed over time). Null shows the latest data.
 */
export function usePokemon(
  nameOrId: string | number | null,
  genNum: number | null = null,
) {
  const { defaultPokemonSpriteGen } = useSpritePreferences();

  return useQuery<Pokemon>({
    queryKey: ["pokemon", nameOrId, defaultPokemonSpriteGen, genNum],
    queryFn: () => {
      if (nameOrId === null) throw new Error("Pokemon id is required");
      const species = findSpeciesByNumOrName(nameOrId);
      if (!species) throw new Error("Species not found");

      // Fall back to the latest data when the Pokemon is absent from the
      // requested generation's games.
      const genSpecies =
        (genNum ? getSpeciesInGen(species.name, genNum) : undefined) ?? species;

      const stats = buildStats(genSpecies.baseStats, genNum ?? LATEST_GEN);

      const abilities = Object.entries(genSpecies.abilities)
        .map(([slot, name]) => ({
          name: name as string,
          isHidden: slot === "H",
        }))
        .filter((a) => a.name);

      return {
        id: species.num,
        name: species.name,
        types: genSpecies.types as PokemonType[],
        sprite:
          pokemonSprite(species.name, { set: defaultPokemonSpriteGen }) ||
          pokemonSpriteById(species.num),
        spriteShiny:
          pokemonSprite(species.name, {
            set: defaultPokemonSpriteGen,
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

/**
 * @param genNum Breeding and gender data as of this generation's games. Gen I
 * had neither, so both come back empty there.
 */
export function usePokemonSpecies(
  nameOrId: string | number | null,
  genNum: number | null = null,
) {
  return useQuery<PokemonSpecies>({
    queryKey: ["pokemon-species", nameOrId, genNum],
    queryFn: () => {
      if (nameOrId === null) throw new Error("Pokemon id is required");
      const species = findSpeciesByNumOrName(nameOrId);
      if (!species) throw new Error("Species not found");

      const genSpecies =
        (genNum ? getSpeciesInGen(species.name, genNum) : undefined) ?? species;
      // Gen I had no breeding and no genders.
      const hasBreeding = (genNum ?? LATEST_GEN) >= FIRST_BREEDING_GEN;
      const eggGroups = hasBreeding ? (genSpecies.eggGroups ?? []) : [];

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
        genderRate: !hasBreeding
          ? -1
          : genSpecies.genderRatio?.F !== undefined
            ? Math.round(genSpecies.genderRatio.F * 8)
            : genSpecies.gender === "N"
              ? -1
              : 4,
        captureRate: 45, // Not available in @pkmn/dex
        baseHappiness: 50, // Not available in @pkmn/dex
        hatchCounter: eggGroups.includes("Undiscovered") ? 120 : 20,
        growthRate: "Medium Fast", // Not available in @pkmn/dex
        eggGroups,
        evYield: [], // Not available in @pkmn/dex
      };
    },
    enabled: nameOrId !== null,
  });
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
  return useQuery<PokemonMove[]>({
    queryKey: ["pokemon-moves", nameOrId, genNum],
    queryFn: async () => {
      if (nameOrId === null) throw new Error("Pokemon id is required");
      const species = findSpeciesByNumOrName(nameOrId);
      if (!species) throw new Error("Species not found");

      const options = { exact: genNum !== null };
      const gen = genNum ?? LATEST_GEN;

      // Try to get moves for the exact species first
      let moves = await getPokemonMoves(species.name, gen, options);

      // If no moves found and this is a forme (Mega, Gmax, regional, etc.),
      // fall back to the base species' learnset
      if (moves.length === 0 && species.baseSpecies) {
        moves = await getPokemonMoves(species.baseSpecies, gen, options);
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

/**
 * @param genNum Limit the chain to Pokemon that existed in this generation's
 * games, e.g. Eevee has no Sylveon before Gen VI. Null includes every stage.
 */
export function useEvolutionChain(
  evolutionChainUrl: string | null,
  genNum: number | null = null,
) {
  const { defaultPokemonSpriteGen } = useSpritePreferences();

  return useQuery<EvolutionChainLink>({
    queryKey: [
      "evolution-chain",
      evolutionChainUrl,
      defaultPokemonSpriteGen,
      genNum,
    ],
    queryFn: () => {
      if (!evolutionChainUrl) throw new Error("No evolution chain");

      const existsInGen = (name: string) =>
        genNum === null || getSpeciesGenerations(name).includes(genNum);

      const startId = evolutionChainUrl.replace("evo-", "");
      // Use Dex.species.get() to include ALL Pokemon, not just those in Gen 9 games
      const startSpecies = Dex.species.get(startId);
      if (!startSpecies?.exists) throw new Error("Species not found");

      function buildChain(
        speciesId: string,
        evolutionDetails: EvolutionChainLink["evolutionDetails"] = [],
      ): EvolutionChainLink {
        const sp = Dex.species.get(speciesId);
        if (!sp?.exists) throw new Error(`Species ${speciesId} not found`);

        // Get all variants that share this dex number (regional forms, etc.)
        // This ensures we find evolutions from any variant, not just the base form
        // e.g., Farfetch'd-Galar evolves to Sirfetch'd, but Farfetch'd (Kanto) doesn't
        const allVariants = getAllSpecies(9, { includeFormes: true }).filter(
          (s) => s.num === sp.num,
        );
        const variantIds = new Set(allVariants.map((v) => toID(v.name)));

        const evolutions: EvolutionChainLink[] = [];
        const seenEvoNums = new Set<number>(); // Track by dex number to avoid duplicates

        for (const otherSpecies of getAllSpecies(9, { includeFormes: true })) {
          // Check if this Pokemon evolves from any variant of the current species
          if (
            otherSpecies.prevo &&
            variantIds.has(toID(otherSpecies.prevo)) &&
            !seenEvoNums.has(otherSpecies.num) &&
            existsInGen(otherSpecies.name)
          ) {
            seenEvoNums.add(otherSpecies.num);
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
            pokemonSprite(sp.name, { set: defaultPokemonSpriteGen }) ||
            pokemonSpriteById(sp.num),
          evolvesTo: evolutions,
          evolutionDetails,
        };
      }

      let baseSpecies = startSpecies;
      while (baseSpecies.prevo) {
        const prev = Dex.species.get(baseSpecies.prevo);
        // Stop at pre-evolutions the generation didn't have yet (Pichu in Gen I)
        if (prev?.exists && existsInGen(prev.name)) baseSpecies = prev;
        else break;
      }

      return buildChain(baseSpecies.id);
    },
    enabled: evolutionChainUrl !== null,
    staleTime: 1000 * 60 * 60,
  });
}

export function useAllPokemonNames(genNum: number | null = null) {
  return useQuery({
    queryKey: ["all-pokemon-names", genNum],
    queryFn: () => {
      return getSpeciesForView(genNum).map((s) => ({
        name: s.name,
        id: s.num,
        sprite: pokemonSpriteById(s.num),
      }));
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useAllMoveNames(genNum: number | null = null) {
  return useQuery({
    queryKey: ["all-move-names", genNum],
    queryFn: () => {
      return getAllMoves(genNum ?? LATEST_GEN).map((m) => ({
        name: m.name,
        id: m.num,
      }));
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useAllAbilityNames(genNum: number | null = null) {
  return useQuery({
    queryKey: ["all-ability-names", genNum],
    queryFn: () => {
      return getAllAbilities(genNum ?? LATEST_GEN).map((a) => ({
        name: a.name,
        id: a.num,
      }));
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useAllItemNames(genNum: number | null = null) {
  return useQuery({
    queryKey: ["all-item-names", genNum],
    queryFn: () => {
      return getAllItems(genNum ?? LATEST_GEN).map((i) => ({
        name: i.name,
        id: i.num,
        sprite: `https://play.pokemonshowdown.com/sprites/itemicons/${toID(i.name)}.png`,
      }));
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useMoveList(genNum: number | null = null) {
  return useQuery({
    queryKey: ["move-list", genNum],
    queryFn: () => {
      const moves = getAllMoves(genNum ?? LATEST_GEN).map(
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

  return useQuery<FullMoveDetail>({
    queryKey: ["move-detail", name, genNum, defaultPokemonSpriteGen],
    queryFn: async () => {
      if (!name) throw new Error("Move name is required");
      const move = getMove(name, genNum ?? LATEST_GEN);
      if (!move) throw new Error("Move not found");

      const learnedBy = await getSpeciesLearningMove(move.name, genNum);
      const pokemon: FullMoveDetail["pokemon"] = learnedBy.map((entry) => {
        const species =
          (genNum ? getSpeciesInGen(entry.name, genNum) : undefined) ??
          resolveSpecies(entry.name);
        return {
          id: entry.num,
          name: entry.name,
          sprite:
            pokemonSprite(entry.name, { set: defaultPokemonSpriteGen }) ||
            pokemonSpriteById(entry.num),
          types: (species?.types ?? []) as PokemonType[],
          learnMethods: entry.methods.map((method) => ({
            method,
            levelLearnedAt: method === "level-up" ? entry.level : 0,
          })),
        };
      });

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
        pokemon,
      };
    },
    enabled: name !== null,
    staleTime: 1000 * 60 * 60,
  });
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

  return useQuery<FullAbilityDetail>({
    queryKey: ["ability-detail", name, genNum, defaultPokemonSpriteGen],
    queryFn: () => {
      if (!name) throw new Error("Ability name is required");
      const ability = getAbility(name, genNum ?? LATEST_GEN);
      if (!ability) throw new Error("Ability not found");

      const pokemon: FullAbilityDetail["pokemon"] = [];
      for (const species of getSpeciesForView(genNum)) {
        const abilities = Object.entries(species.abilities);
        for (const [slot, abilityName] of abilities) {
          if (toID(abilityName as string) === ability.id) {
            pokemon.push({
              id: species.num,
              name: species.name,
              sprite:
                pokemonSprite(species.name, {
                  set: defaultPokemonSpriteGen,
                }) || pokemonSpriteById(species.num),
              types: species.types as PokemonType[],
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

/**
 * @param genNum Damage relations as of this generation's games — the chart
 * changed in Gen II (Dark/Steel, Ghost hitting Psychic) and Gen VI (Fairy,
 * Steel losing its Ghost/Dark resistances). Null uses the latest chart.
 */
export function useAllTypes(genNum: number | null = null) {
  return useQuery<TypeDetail[]>({
    queryKey: ["all-types", genNum],
    queryFn: () => {
      const genView = genNum ?? LATEST_GEN;
      const gen = gens.get(genView);
      return getAllTypes(genView).map((type, idx) => {
        const damageRelations: TypeDamageRelations = {
          doubleDamageTo: [],
          halfDamageTo: [],
          noDamageTo: [],
          doubleDamageFrom: [],
          halfDamageFrom: [],
          noDamageFrom: [],
        };

        for (const otherType of getAllTypes(genView)) {
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
          generation: getGenerationName(getTypeGenerations(type.name)[0] ?? 1),
        };
      });
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
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

  return useQuery<FullTypeDetail>({
    queryKey: ["type-detail", name, genNum, defaultPokemonSpriteGen],
    queryFn: () => {
      if (!name) throw new Error("Type name is required");
      const genView = genNum ?? LATEST_GEN;
      const type = getType(name, genView);
      if (!type) throw new Error("Type not found");

      const gen = gens.get(genView);
      const damageRelations: TypeDamageRelations = {
        doubleDamageTo: [],
        halfDamageTo: [],
        noDamageTo: [],
        doubleDamageFrom: [],
        halfDamageFrom: [],
        noDamageFrom: [],
      };

      for (const otherType of getAllTypes(genView)) {
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
      for (const species of getSpeciesForView(genNum)) {
        const typeIndex = species.types.indexOf(type.name);
        if (typeIndex !== -1) {
          pokemon.push({
            id: species.num,
            name: species.name,
            sprite:
              pokemonSprite(species.name, { set: defaultPokemonSpriteGen }) ||
              pokemonSpriteById(species.num),
            types: species.types as PokemonType[],
            slot: (typeIndex + 1) as 1 | 2,
          });
        }
      }

      return {
        id: 1,
        name: type.name as PokemonType,
        damageRelations,
        generation: getGenerationName(getTypeGenerations(type.name)[0] ?? 1),
        pokemon: pokemon.sort((a, b) => a.id - b.id),
      };
    },
    enabled: name !== null,
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useItemList(genNum: number | null = null) {
  return useQuery({
    queryKey: ["item-list", genNum],
    queryFn: () => {
      const items = getAllItems(genNum ?? LATEST_GEN).map(
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

/**
 * @param genNum Read the item as it was in this generation's games, or null for
 * the latest data.
 */
export function useFullItemDetail(
  name: string | null,
  genNum: number | null = null,
) {
  return useQuery<FullItemDetail>({
    queryKey: ["item-detail", name, genNum],
    queryFn: () => {
      if (!name) throw new Error("Item name is required");
      const item = getItem(name, genNum ?? LATEST_GEN);
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
