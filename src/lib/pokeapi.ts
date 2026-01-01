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

async function parseEvolutionChain(chain: {
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
}): Promise<EvolutionChainLink> {
  const speciesId = getPokemonIdFromSpeciesUrl(chain.species.url)

  const evolvesToPromises = chain.evolves_to.map((e) => parseEvolutionChain(e))
  const evolvesTo = await Promise.all(evolvesToPromises)

  const evolutionDetails: EvolutionDetail[] = chain.evolves_to.length > 0
    ? chain.evolves_to.flatMap((e) =>
        e.evolution_details.map((d) => ({
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
      )
    : []

  return {
    id: speciesId,
    name: formatName(chain.species.name),
    sprite: getSpriteUrl(speciesId),
    evolvesTo,
    evolutionDetails,
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
