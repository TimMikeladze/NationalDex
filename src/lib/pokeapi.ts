import Pokedex from "pokedex-promise-v2"
import type {
  Pokemon,
  PokemonAbility,
  PokemonListResponse,
  PokemonSpecies,
  PokemonStat,
  PokemonType,
  PokemonMove,
  EvolutionChainLink,
  EvolutionDetail,
  TypeEffectiveness,
  MoveDetail,
  AbilityDetail,
  MoveListResponse,
  MoveListItem,
  FullMoveDetail,
  MovePokemon,
  FullAbilityDetail,
  AbilityPokemon,
  TypeDetail,
  TypeDamageRelations,
  TypePokemon,
  FullTypeDetail,
  ItemListResponse,
  ItemListItem,
  ItemPocket,
  FullItemDetail,
  ItemHeldByPokemon,
} from "@/types/pokemon"

const client = new Pokedex({
  cacheLimit: 1000 * 60 * 60 * 24, // 24 hours
  timeout: 10 * 1000, // 10 seconds
})

export async function getPokemonList(
  offset = 0,
  limit = 20
): Promise<PokemonListResponse> {
  const response = await client.getPokemonsList({ offset, limit })
  return {
    count: response.count,
    next: response.next,
    previous: response.previous,
    results: response.results,
  }
}

export async function getPokemon(nameOrId: string | number): Promise<Pokemon> {
  const data = await client.getPokemonByName(nameOrId)

  const types = data.types
    .sort((a, b) => a.slot - b.slot)
    .map((t) => t.type.name as PokemonType)

  const stats: PokemonStat[] = data.stats.map((s) => ({
    name: formatStatName(s.stat.name),
    value: s.base_stat,
  }))

  const abilities: PokemonAbility[] = data.abilities.map((a) => ({
    name: formatName(a.ability.name),
    isHidden: a.is_hidden,
  }))

  return {
    id: data.id,
    name: formatName(data.name),
    types,
    sprite: data.sprites.front_default ?? "",
    spriteShiny: data.sprites.front_shiny,
    height: data.height,
    weight: data.weight,
    stats,
    abilities,
  }
}

export async function getPokemonSpecies(
  nameOrId: string | number
): Promise<PokemonSpecies> {
  const data = await client.getPokemonSpeciesByName(nameOrId)

  const englishEntry = data.flavor_text_entries.find(
    (e) => e.language.name === "en"
  )
  const englishGenus = data.genera.find((g) => g.language.name === "en")

  // Get EV yield from pokemon data
  const pokemonData = await client.getPokemonByName(nameOrId)
  const evYield = pokemonData.stats
    .filter((s) => s.effort > 0)
    .map((s) => ({
      stat: formatStatName(s.stat.name),
      value: s.effort,
    }))

  return {
    id: data.id,
    name: formatName(data.name),
    description: englishEntry?.flavor_text.replace(/\f|\n/g, " ") ?? "",
    genus: englishGenus?.genus ?? "",
    evolutionChainUrl: data.evolution_chain?.url ?? null,
    generation: formatName(data.generation.name),
    genderRate: data.gender_rate,
    captureRate: data.capture_rate,
    baseHappiness: data.base_happiness ?? 50,
    hatchCounter: data.hatch_counter ?? 20,
    growthRate: formatName(data.growth_rate.name),
    eggGroups: data.egg_groups.map((g) => formatName(g.name)),
    evYield,
  }
}

export async function getPokemonMoves(
  nameOrId: string | number
): Promise<PokemonMove[]> {
  const data = await client.getPokemonByName(nameOrId)

  const movePromises = data.moves.map(async (m) => {
    const versionDetail = m.version_group_details.find(
      (v) => v.version_group.name === "scarlet-violet"
    ) || m.version_group_details[m.version_group_details.length - 1]

    if (!versionDetail) return null

    try {
      const moveData = await client.getMoveByName(m.move.name)
      const learnMethod = mapLearnMethod(versionDetail.move_learn_method.name)

      return {
        name: formatName(m.move.name),
        type: moveData.type.name as PokemonType,
        power: moveData.power,
        accuracy: moveData.accuracy,
        pp: moveData.pp ?? 0,
        damageClass: moveData.damage_class.name as "physical" | "special" | "status",
        learnMethod,
        levelLearnedAt: versionDetail.level_learned_at,
      }
    } catch {
      return null
    }
  })

  const moves = await Promise.all(movePromises)
  return moves.filter((m): m is PokemonMove => m !== null)
}

function mapLearnMethod(method: string): PokemonMove["learnMethod"] {
  switch (method) {
    case "level-up":
      return "level-up"
    case "machine":
      return "machine"
    case "egg":
      return "egg"
    case "tutor":
      return "tutor"
    default:
      return "other"
  }
}

export async function getEvolutionChain(
  url: string
): Promise<EvolutionChainLink> {
  const id = url.match(/evolution-chain\/(\d+)/)?.[1]
  if (!id) throw new Error("Invalid evolution chain URL")

  const data = await client.getEvolutionChainById(Number(id))
  return parseEvolutionChain(data.chain)
}

async function parseEvolutionChain(
  chain: {
    species: { name: string; url: string }
    evolves_to: Array<{
      species: { name: string; url: string }
      evolution_details: Array<{
        trigger: { name: string }
        min_level: number | null
        item: { name: string } | null
        held_item: { name: string } | null
        time_of_day: string
        min_happiness: number | null
        known_move: { name: string } | null
        location: { name: string } | null
      }>
      evolves_to: typeof chain.evolves_to
    }>
  },
  evolutionDetailsToThis: EvolutionDetail[] = []
): Promise<EvolutionChainLink> {
  const speciesId = getPokemonIdFromSpeciesUrl(chain.species.url)

  // Parse each evolution target, passing its evolution_details to set on the target
  const evolvesToPromises = chain.evolves_to.map((e) => {
    const detailsToTarget: EvolutionDetail[] = e.evolution_details.map((d) => ({
      trigger: formatName(d.trigger.name),
      minLevel: d.min_level,
      item: d.item ? formatName(d.item.name) : null,
      heldItem: d.held_item ? formatName(d.held_item.name) : null,
      timeOfDay: d.time_of_day || null,
      minHappiness: d.min_happiness,
      knownMove: d.known_move ? formatName(d.known_move.name) : null,
      location: d.location ? formatName(d.location.name) : null,
      otherRequirement: null,
    }))
    return parseEvolutionChain(e, detailsToTarget)
  })
  const evolvesTo = await Promise.all(evolvesToPromises)

  return {
    id: speciesId,
    name: formatName(chain.species.name),
    sprite: getSpriteUrl(speciesId),
    evolvesTo,
    evolutionDetails: evolutionDetailsToThis,
  }
}

function getPokemonIdFromSpeciesUrl(url: string): number {
  const match = url.match(/pokemon-species\/(\d+)/)
  return match ? Number.parseInt(match[1], 10) : 0
}

// Type effectiveness chart
const TYPE_CHART: Record<PokemonType, { weak: PokemonType[]; resist: PokemonType[]; immune: PokemonType[] }> = {
  normal: { weak: ["fighting"], resist: [], immune: ["ghost"] },
  fire: { weak: ["water", "ground", "rock"], resist: ["fire", "grass", "ice", "bug", "steel", "fairy"], immune: [] },
  water: { weak: ["electric", "grass"], resist: ["fire", "water", "ice", "steel"], immune: [] },
  electric: { weak: ["ground"], resist: ["electric", "flying", "steel"], immune: [] },
  grass: { weak: ["fire", "ice", "poison", "flying", "bug"], resist: ["water", "electric", "grass", "ground"], immune: [] },
  ice: { weak: ["fire", "fighting", "rock", "steel"], resist: ["ice"], immune: [] },
  fighting: { weak: ["flying", "psychic", "fairy"], resist: ["bug", "rock", "dark"], immune: [] },
  poison: { weak: ["ground", "psychic"], resist: ["grass", "fighting", "poison", "bug", "fairy"], immune: [] },
  ground: { weak: ["water", "grass", "ice"], resist: ["poison", "rock"], immune: ["electric"] },
  flying: { weak: ["electric", "ice", "rock"], resist: ["grass", "fighting", "bug"], immune: ["ground"] },
  psychic: { weak: ["bug", "ghost", "dark"], resist: ["fighting", "psychic"], immune: [] },
  bug: { weak: ["fire", "flying", "rock"], resist: ["grass", "fighting", "ground"], immune: [] },
  rock: { weak: ["water", "grass", "fighting", "ground", "steel"], resist: ["normal", "fire", "poison", "flying"], immune: [] },
  ghost: { weak: ["ghost", "dark"], resist: ["poison", "bug"], immune: ["normal", "fighting"] },
  dragon: { weak: ["ice", "dragon", "fairy"], resist: ["fire", "water", "electric", "grass"], immune: [] },
  dark: { weak: ["fighting", "bug", "fairy"], resist: ["ghost", "dark"], immune: ["psychic"] },
  steel: { weak: ["fire", "fighting", "ground"], resist: ["normal", "grass", "ice", "flying", "psychic", "bug", "rock", "dragon", "steel", "fairy"], immune: ["poison"] },
  fairy: { weak: ["poison", "steel"], resist: ["fighting", "bug", "dark"], immune: ["dragon"] },
}

export function calculateTypeEffectiveness(types: PokemonType[]): TypeEffectiveness {
  const multipliers: Record<PokemonType, number> = {} as Record<PokemonType, number>

  // Initialize all types with 1x
  const allTypes: PokemonType[] = [
    "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
    "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"
  ]
  for (const t of allTypes) {
    multipliers[t] = 1
  }

  // Calculate combined effectiveness
  for (const defenderType of types) {
    const chart = TYPE_CHART[defenderType]

    for (const t of chart.weak) {
      multipliers[t] *= 2
    }
    for (const t of chart.resist) {
      multipliers[t] *= 0.5
    }
    for (const t of chart.immune) {
      multipliers[t] *= 0
    }
  }

  const weaknesses: TypeEffectiveness["weaknesses"] = []
  const resistances: TypeEffectiveness["resistances"] = []
  const immunities: PokemonType[] = []

  for (const [type, mult] of Object.entries(multipliers)) {
    if (mult === 0) {
      immunities.push(type as PokemonType)
    } else if (mult > 1) {
      weaknesses.push({ type: type as PokemonType, multiplier: mult })
    } else if (mult < 1) {
      resistances.push({ type: type as PokemonType, multiplier: mult })
    }
  }

  // Sort by multiplier (4x before 2x, 0.25x before 0.5x)
  weaknesses.sort((a, b) => b.multiplier - a.multiplier)
  resistances.sort((a, b) => a.multiplier - b.multiplier)

  return { weaknesses, resistances, immunities }
}

function formatName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatStatName(stat: string): string {
  const mapping: Record<string, string> = {
    hp: "HP",
    attack: "Attack",
    defense: "Defense",
    "special-attack": "Sp. Atk",
    "special-defense": "Sp. Def",
    speed: "Speed",
  }
  return mapping[stat] ?? formatName(stat)
}

export function getPokemonIdFromUrl(url: string): number {
  const match = url.match(/\/pokemon\/(\d+)\//)
  return match ? Number.parseInt(match[1], 10) : 0
}

export function getSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

export async function getMoveDetail(nameOrId: string | number): Promise<MoveDetail> {
  // Convert formatted name back to API name (e.g., "Vine Whip" -> "vine-whip")
  const apiName = typeof nameOrId === "string"
    ? nameOrId.toLowerCase().replace(/\s+/g, "-")
    : nameOrId

  const data = await client.getMoveByName(apiName)

  const englishEffect = data.effect_entries.find(
    (e) => e.language.name === "en"
  )
  const englishFlavor = data.flavor_text_entries.find(
    (e) => e.language.name === "en"
  )

  // Replace $effect_chance with actual value in description
  let description = englishEffect?.short_effect ?? englishFlavor?.flavor_text ?? ""
  if (data.effect_chance) {
    description = description.replace(/\$effect_chance/g, String(data.effect_chance))
  }

  return {
    id: data.id,
    name: formatName(data.name),
    type: data.type.name as PokemonType,
    damageClass: data.damage_class.name as "physical" | "special" | "status",
    power: data.power,
    accuracy: data.accuracy,
    pp: data.pp ?? 0,
    priority: data.priority,
    description: description.replace(/\f|\n/g, " "),
    effectChance: data.effect_chance,
    target: formatName(data.target.name),
    generation: formatName(data.generation.name),
  }
}

export async function getAbilityDetail(nameOrId: string | number): Promise<AbilityDetail> {
  // Convert formatted name back to API name (e.g., "Overgrow" -> "overgrow")
  const apiName = typeof nameOrId === "string"
    ? nameOrId.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "")
    : nameOrId

  const data = await client.getAbilityByName(apiName)

  const englishEffect = data.effect_entries.find(
    (e) => e.language.name === "en"
  )
  const englishFlavor = data.flavor_text_entries.find(
    (e) => e.language.name === "en"
  )

  return {
    id: data.id,
    name: formatName(data.name),
    description: englishEffect?.effect?.replace(/\f|\n/g, " ") ?? "",
    shortDescription: englishFlavor?.flavor_text?.replace(/\f|\n/g, " ") ?? englishEffect?.short_effect ?? "",
    generation: formatName(data.generation.name),
    isMainSeries: data.is_main_series,
  }
}

// ============================================================================
// Move List & Detail (for dedicated pages)
// ============================================================================

export async function getMoveList(
  offset = 0,
  limit = 20
): Promise<MoveListResponse> {
  const response = await client.getMovesList({ offset, limit })
  return {
    count: response.count,
    next: response.next,
    previous: response.previous,
    results: response.results,
  }
}

export async function getMoveListItem(name: string): Promise<MoveListItem | null> {
  try {
    const data = await client.getMoveByName(name)
    return {
      id: data.id,
      name: formatName(data.name),
      type: data.type.name as PokemonType,
      damageClass: data.damage_class.name as "physical" | "special" | "status",
      power: data.power,
      accuracy: data.accuracy,
      pp: data.pp ?? 0,
      generation: formatName(data.generation.name),
    }
  } catch {
    return null
  }
}

export async function getFullMoveDetail(nameOrId: string | number): Promise<FullMoveDetail> {
  const apiName = typeof nameOrId === "string"
    ? nameOrId.toLowerCase().replace(/\s+/g, "-")
    : nameOrId

  const data = await client.getMoveByName(apiName)

  const englishEffect = data.effect_entries.find(
    (e) => e.language.name === "en"
  )
  const englishFlavor = data.flavor_text_entries.find(
    (e) => e.language.name === "en"
  )

  let description = englishEffect?.short_effect ?? englishFlavor?.flavor_text ?? ""
  if (data.effect_chance) {
    description = description.replace(/\$effect_chance/g, String(data.effect_chance))
  }

  // Get Pokemon that learn this move
  const pokemon: MovePokemon[] = data.learned_by_pokemon.map((p) => {
    const id = getPokemonIdFromUrl(p.url)
    return {
      id,
      name: formatName(p.name),
      sprite: getSpriteUrl(id),
      learnMethods: [], // Will be populated if needed
    }
  })

  return {
    id: data.id,
    name: formatName(data.name),
    type: data.type.name as PokemonType,
    damageClass: data.damage_class.name as "physical" | "special" | "status",
    power: data.power,
    accuracy: data.accuracy,
    pp: data.pp ?? 0,
    priority: data.priority,
    description: description.replace(/\f|\n/g, " "),
    effectChance: data.effect_chance,
    target: formatName(data.target.name),
    generation: formatName(data.generation.name),
    pokemon,
  }
}

// ============================================================================
// Ability Detail (for dedicated page)
// ============================================================================

export async function getFullAbilityDetail(nameOrId: string | number): Promise<FullAbilityDetail> {
  const apiName = typeof nameOrId === "string"
    ? nameOrId.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "")
    : nameOrId

  const data = await client.getAbilityByName(apiName)

  const englishEffect = data.effect_entries.find(
    (e) => e.language.name === "en"
  )
  const englishFlavor = data.flavor_text_entries.find(
    (e) => e.language.name === "en"
  )

  // Get Pokemon with this ability
  const pokemon: AbilityPokemon[] = data.pokemon.map((p) => {
    const id = getPokemonIdFromUrl(p.pokemon.url)
    return {
      id,
      name: formatName(p.pokemon.name),
      sprite: getSpriteUrl(id),
      isHidden: p.is_hidden,
    }
  })

  return {
    id: data.id,
    name: formatName(data.name),
    description: englishEffect?.effect?.replace(/\f|\n/g, " ") ?? "",
    shortDescription: englishFlavor?.flavor_text?.replace(/\f|\n/g, " ") ?? englishEffect?.short_effect ?? "",
    generation: formatName(data.generation.name),
    isMainSeries: data.is_main_series,
    pokemon,
  }
}

// Generation mapping for filtering
export const GENERATIONS = [
  { id: "generation-i", name: "Gen I", label: "Red/Blue" },
  { id: "generation-ii", name: "Gen II", label: "Gold/Silver" },
  { id: "generation-iii", name: "Gen III", label: "Ruby/Sapphire" },
  { id: "generation-iv", name: "Gen IV", label: "Diamond/Pearl" },
  { id: "generation-v", name: "Gen V", label: "Black/White" },
  { id: "generation-vi", name: "Gen VI", label: "X/Y" },
  { id: "generation-vii", name: "Gen VII", label: "Sun/Moon" },
  { id: "generation-viii", name: "Gen VIII", label: "Sword/Shield" },
  { id: "generation-ix", name: "Gen IX", label: "Scarlet/Violet" },
] as const

export const ALL_TYPES: PokemonType[] = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"
]

export const DAMAGE_CLASSES = ["physical", "special", "status"] as const

// Get Pokemon list for a specific generation range
export async function getPokemonByGenerationRange(
  startId: number,
  endId: number
): Promise<{ id: number; name: string; sprite: string }[]> {
  const pokemon: { id: number; name: string; sprite: string }[] = []

  for (let id = startId; id <= endId; id++) {
    pokemon.push({
      id,
      name: formatName(await getPokemonNameById(id)),
      sprite: getSpriteUrl(id),
    })
  }

  return pokemon
}

// Simple cache for Pokemon names to avoid redundant API calls
const pokemonNameCache = new Map<number, string>()

async function getPokemonNameById(id: number): Promise<string> {
  if (pokemonNameCache.has(id)) {
    return pokemonNameCache.get(id)!
  }

  try {
    const data = await client.getPokemonByName(id)
    pokemonNameCache.set(id, data.name)
    return data.name
  } catch {
    return `pokemon-${id}`
  }
}

// ============================================================================
// Type Detail (for dedicated pages)
// ============================================================================

export async function getTypeDetail(name: string): Promise<TypeDetail> {
  const data = await client.getTypeByName(name.toLowerCase())

  const damageRelations: TypeDamageRelations = {
    doubleDamageTo: data.damage_relations.double_damage_to.map((t) => t.name as PokemonType),
    halfDamageTo: data.damage_relations.half_damage_to.map((t) => t.name as PokemonType),
    noDamageTo: data.damage_relations.no_damage_to.map((t) => t.name as PokemonType),
    doubleDamageFrom: data.damage_relations.double_damage_from.map((t) => t.name as PokemonType),
    halfDamageFrom: data.damage_relations.half_damage_from.map((t) => t.name as PokemonType),
    noDamageFrom: data.damage_relations.no_damage_from.map((t) => t.name as PokemonType),
  }

  return {
    id: data.id,
    name: data.name as PokemonType,
    damageRelations,
    generation: formatName(data.generation.name),
  }
}

export async function getFullTypeDetail(name: string): Promise<FullTypeDetail> {
  const data = await client.getTypeByName(name.toLowerCase())

  const damageRelations: TypeDamageRelations = {
    doubleDamageTo: data.damage_relations.double_damage_to.map((t) => t.name as PokemonType),
    halfDamageTo: data.damage_relations.half_damage_to.map((t) => t.name as PokemonType),
    noDamageTo: data.damage_relations.no_damage_to.map((t) => t.name as PokemonType),
    doubleDamageFrom: data.damage_relations.double_damage_from.map((t) => t.name as PokemonType),
    halfDamageFrom: data.damage_relations.half_damage_from.map((t) => t.name as PokemonType),
    noDamageFrom: data.damage_relations.no_damage_from.map((t) => t.name as PokemonType),
  }

  // Get Pokemon of this type (filter to main series Pokemon, id <= 1025)
  const pokemon: TypePokemon[] = data.pokemon
    .map((p) => {
      const id = getPokemonIdFromUrl(p.pokemon.url)
      return {
        id,
        name: formatName(p.pokemon.name),
        sprite: getSpriteUrl(id),
        slot: p.slot as 1 | 2,
      }
    })
    .filter((p) => p.id <= 1025) // Only main series Pokemon
    .sort((a, b) => a.id - b.id)

  return {
    id: data.id,
    name: data.name as PokemonType,
    damageRelations,
    generation: formatName(data.generation.name),
    pokemon,
  }
}

// Get basic type info for all 18 types (for index page)
export async function getAllTypesWithRelations(): Promise<TypeDetail[]> {
  const typePromises = ALL_TYPES.map((type) => getTypeDetail(type))
  return Promise.all(typePromises)
}

// ============================================================================
// Item List & Detail (for dedicated pages)
// ============================================================================

// Map PokeAPI pocket names to our ItemPocket type
function mapPocketName(pocketName: string): ItemPocket {
  const mapping: Record<string, ItemPocket> = {
    misc: "misc",
    medicine: "medicine",
    "poke-balls": "pokeballs",
    machines: "machines",
    berries: "berries",
    mail: "mail",
    battle: "battle",
    "key-items": "key",
  }
  return mapping[pocketName] ?? "misc"
}

export async function getItemList(
  offset = 0,
  limit = 20
): Promise<ItemListResponse> {
  const response = await client.getItemsList({ offset, limit })
  return {
    count: response.count,
    next: response.next,
    previous: response.previous,
    results: response.results,
  }
}

export async function getItemListItem(name: string): Promise<ItemListItem | null> {
  try {
    const data = await client.getItemByName(name)
    return {
      id: data.id,
      name: formatName(data.name),
      sprite: data.sprites.default,
      category: formatName(data.category.name),
      pocket: mapPocketName(data.category.pocket.name),
      cost: data.cost,
    }
  } catch {
    return null
  }
}

export async function getFullItemDetail(nameOrId: string | number): Promise<FullItemDetail> {
  const apiName = typeof nameOrId === "string"
    ? nameOrId.toLowerCase().replace(/\s+/g, "-")
    : nameOrId

  const data = await client.getItemByName(apiName)

  const englishEffect = data.effect_entries.find(
    (e) => e.language.name === "en"
  )
  const englishFlavor = data.flavor_text_entries.find(
    (e) => e.language.name === "en"
  )

  // Get fling effect if present
  let flingEffect: FullItemDetail["flingEffect"] = null
  if (data.fling_effect) {
    try {
      // Extract fling effect name from URL and fetch by name
      const flingEffectName = data.fling_effect.name
      const flingData = await client.getItemFlingEffectByName(flingEffectName)
      const englishFlingEffect = flingData.effect_entries.find(
        (e) => e.language.name === "en"
      )
      flingEffect = {
        name: formatName(flingData.name),
        description: englishFlingEffect?.effect ?? "",
      }
    } catch {
      // Fling effect not found, leave as null
    }
  }

  // Get Pokemon that hold this item
  const heldByPokemon: ItemHeldByPokemon[] = data.held_by_pokemon.map((p) => {
    const id = getPokemonIdFromUrl(p.pokemon.url)
    // Get rarity from the most recent version
    const latestVersion = p.version_details[p.version_details.length - 1]
    return {
      id,
      name: formatName(p.pokemon.name),
      sprite: getSpriteUrl(id),
      rarity: latestVersion?.rarity ?? 0,
    }
  })

  // Get game indices for availability info
  const gameIndices = data.game_indices.map((g) => ({
    game: formatName(g.generation.name),
    generation: formatName(g.generation.name),
  }))

  return {
    id: data.id,
    name: formatName(data.name),
    sprite: data.sprites.default,
    category: formatName(data.category.name),
    pocket: mapPocketName(data.category.pocket.name),
    cost: data.cost,
    flingPower: data.fling_power,
    flingEffect,
    description: englishEffect?.effect?.replace(/\f|\n/g, " ") ?? "",
    shortDescription: englishFlavor?.text?.replace(/\f|\n/g, " ") ?? "",
    attributes: data.attributes.map((a) => formatName(a.name)),
    heldByPokemon,
    gameIndices,
  }
}

// Get all item categories for filtering
export async function getItemCategories(): Promise<{ id: string; name: string; pocket: ItemPocket }[]> {
  const response = await client.getItemCategoriesList({ limit: 100 })

  const categories = await Promise.all(
    response.results.map(async (cat) => {
      try {
        const data = await client.getItemCategoryByName(cat.name)
        return {
          id: cat.name,
          name: formatName(cat.name),
          pocket: mapPocketName(data.pocket.name),
        }
      } catch {
        return null
      }
    })
  )

  return categories.filter((c): c is NonNullable<typeof c> => c !== null)
}

// All item pockets for filtering
export const ALL_ITEM_POCKETS: ItemPocket[] = [
  "medicine",
  "pokeballs",
  "machines",
  "berries",
  "battle",
  "key",
  "mail",
  "misc",
]
