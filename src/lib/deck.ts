/**
 * What a deck is made of, and whether it holds together.
 *
 * Everything here is the deck-building knowledge a player brings to a list:
 * the construction rules a format enforces, and the judgements that separate a
 * legal sixty cards from a deck that actually functions — enough Basics to
 * start on, evolution lines that are not top-heavy, energy that can pay for the
 * attacks printed on the Pokemon playing it.
 */

import type {
  Deck,
  DeckCard,
  DeckEntry,
  DeckFormat,
  DeckGrouping,
} from "@/types/deck";
import { bannedCardReason, standardRegulationMarks } from "@/types/deck";
import type { TcgCard, TcgCardBrief } from "@/types/tcg";
import { setIdFromCardId, TCG_ENERGY_TYPES } from "@/types/tcg";

// =============================================================================
// Snapshots
// =============================================================================

/** The parts of a card a deck keeps once the card is in it. */
export function toDeckCard(card: TcgCard): DeckCard {
  return {
    id: card.id,
    name: card.name,
    localId: card.localId,
    image: card.image,
    category: card.category,
    rarity: card.rarity,
    setId: card.set?.id ?? setIdFromCardId(card.id),
    setName: card.set?.name ?? setIdFromCardId(card.id),
    types: card.types,
    hp: card.hp,
    stage: card.stage,
    suffix: card.suffix,
    evolveFrom: card.evolveFrom,
    trainerType: card.trainerType,
    energyType: card.energyType,
    retreat: card.retreat,
    regulationMark: card.regulationMark,
    legal: card.legal,
    attacks: card.attacks?.map((attack) => ({
      name: attack.name,
      cost: attack.cost,
      damage: attack.damage,
    })),
    abilities: card.abilities?.map((ability) => ({
      name: ability.name,
      type: ability.type,
    })),
    weaknesses: card.weaknesses,
  };
}

/** A deck card as the grid and the viewer want it. */
export function toCardBrief(card: DeckCard): TcgCardBrief {
  return {
    id: card.id,
    name: card.name,
    localId: card.localId,
    image: card.image,
  };
}

// =============================================================================
// Reading a card
// =============================================================================

function normalize(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function isPokemon(card: DeckCard): boolean {
  return normalize(card.category) === "pokemon";
}

export function isTrainer(card: DeckCard): boolean {
  return normalize(card.category) === "trainer";
}

export function isEnergy(card: DeckCard): boolean {
  return normalize(card.category) === "energy";
}

/**
 * Basic Energy is the one card a deck may hold any number of, so telling it
 * apart from Special Energy is a rule rather than a detail. TCGdex says so on
 * `energyType`, and the printed name says so too for anything it has not
 * catalogued.
 */
export function isBasicEnergy(card: DeckCard): boolean {
  if (!isEnergy(card)) return false;
  if (card.energyType) return normalize(card.energyType) === "basic";
  return /^basic\b/i.test(card.name) || isNamedEnergyType(card.name);
}

export function isSpecialEnergy(card: DeckCard): boolean {
  return isEnergy(card) && !isBasicEnergy(card);
}

function isNamedEnergyType(name: string): boolean {
  return TCG_ENERGY_TYPES.some((type) =>
    new RegExp(`^${type}\\s+energy$`, "i").test(name.trim()),
  );
}

/** The energy an Energy card provides, read off its name where it has to be. */
export function energyCardType(card: DeckCard): string | null {
  if (!isEnergy(card)) return null;
  const fromTypes = card.types?.find((type) =>
    (TCG_ENERGY_TYPES as readonly string[]).includes(type),
  );
  if (fromTypes) return fromTypes;
  return (
    TCG_ENERGY_TYPES.find((type) =>
      new RegExp(`\\b${type}\\b`, "i").test(card.name),
    ) ?? null
  );
}

export type TrainerKind = "Supporter" | "Item" | "Tool" | "Stadium" | "Trainer";

/**
 * Which of the four Trainer cards this is. They are played under completely
 * different restrictions — one Supporter a turn, one Stadium in play — so a
 * deck list counts them separately.
 */
export function trainerKind(card: DeckCard): TrainerKind {
  const kind = normalize(card.trainerType);
  if (kind.includes("supporter")) return "Supporter";
  if (kind.includes("stadium")) return "Stadium";
  if (kind.includes("tool")) return "Tool";
  if (kind.includes("item")) return "Item";
  return "Trainer";
}

export type PokemonStage =
  | "Basic"
  | "Stage 1"
  | "Stage 2"
  | "VMAX"
  | "VSTAR"
  | "MEGA"
  | "BREAK"
  | "Restored"
  | "Level Up"
  | "Evolution";

/** The printed stage, normalised — TCGdex writes `Stage1`, players write it out. */
export function pokemonStage(card: DeckCard): PokemonStage {
  const stage = normalize(card.stage).replace(/[\s_-]/g, "");
  if (!stage) return card.evolveFrom ? "Evolution" : "Basic";
  if (stage === "basic") return "Basic";
  if (stage === "stage1") return "Stage 1";
  if (stage === "stage2") return "Stage 2";
  if (stage === "vmax") return "VMAX";
  if (stage === "vstar") return "VSTAR";
  if (stage === "mega") return "MEGA";
  if (stage === "break") return "BREAK";
  if (stage === "restored") return "Restored";
  if (stage.startsWith("level")) return "Level Up";
  return "Evolution";
}

/**
 * A Basic Pokemon — the only card you can legally start a game with. Every
 * consistency number in a deck comes back to how many of these it plays.
 */
export function isBasicPokemon(card: DeckCard): boolean {
  return isPokemon(card) && pokemonStage(card) === "Basic";
}

const RULE_BOX_SUFFIXES = new Set([
  "ex",
  "gx",
  "v",
  "vmax",
  "vstar",
  "vunion",
  "tagteam",
  "tagteamgx",
  "legend",
  "prismstar",
  "radiant",
]);

/**
 * Whether the card carries a rule box — the printed paragraph that gives extra
 * prizes away. Gym Leader Challenge bans every one of them, and outside GLC the
 * count is still the first thing a player reads off a list: a deck of six rule
 * box Pokemon gives up two prizes a knockout.
 */
export function hasRuleBox(card: DeckCard): boolean {
  if (!isPokemon(card)) return isAceSpec(card);
  const suffix = normalize(card.suffix).replace(/[\s-]/g, "");
  if (suffix && RULE_BOX_SUFFIXES.has(suffix)) return true;
  if (isRadiant(card) || isPrismStar(card)) return true;
  // The mechanic is printed on the name, joined by a space or a hyphen:
  // "Charizard ex", "Pikachu & Zekrom-GX", "Mewtwo V-UNION".
  return /(?:\s|-)(ex|gx|v|vmax|vstar|union)$/i.test(card.name.trim());
}

/** ACE SPEC cards are one per deck, whatever else is in it. */
export function isAceSpec(card: DeckCard): boolean {
  return (
    /ace\s*spec/i.test(card.rarity ?? "") ||
    /ace\s*spec/i.test(card.suffix ?? "") ||
    /^rare ace$/i.test(card.rarity ?? "")
  );
}

/** Radiant Pokemon are one per deck, and the name always says so. */
export function isRadiant(card: DeckCard): boolean {
  return (
    /^radiant\s/i.test(card.name) || /radiant rare/i.test(card.rarity ?? "")
  );
}

export function isPrismStar(card: DeckCard): boolean {
  return (
    card.name.includes("◇") ||
    /prism star/i.test(card.name) ||
    /prism star/i.test(card.suffix ?? "")
  );
}

/**
 * The name the copy limit counts by. Two printings of the same card share the
 * four-copy limit however different their artwork is, and Prism Star and ACE
 * SPEC markers are part of the printed name rather than something to strip.
 */
export function copyLimitName(card: DeckCard): string {
  return card.name.trim().toLowerCase();
}

// =============================================================================
// Reading a deck
// =============================================================================

export function deckSize(deck: Deck): number {
  return deck.entries.reduce((total, entry) => total + entry.count, 0);
}

export function entriesOf(deck: Deck, predicate: (card: DeckCard) => boolean) {
  return deck.entries.filter((entry) => predicate(entry.card));
}

export function countOf(
  entries: DeckEntry[],
  predicate?: (card: DeckCard) => boolean,
): number {
  return entries.reduce(
    (total, entry) =>
      total + (!predicate || predicate(entry.card) ? entry.count : 0),
    0,
  );
}

// =============================================================================
// Odds
//
// Deck building is a probability exercise dressed as a card game: how often a
// hand opens without a Basic, how often a one-of is sitting under the prizes,
// how often the card the deck is built around shows up on turn one. All three
// are the same hypergeometric draw, so they are all one function.
// =============================================================================

/**
 * The chance of drawing none of `successes` in `draws` cards from `population`.
 * Multiplied step by step rather than through factorials, which keeps a
 * sixty-card deck well inside what a double can hold exactly.
 */
export function chanceOfNone(
  population: number,
  successes: number,
  draws: number,
): number {
  if (population <= 0 || draws <= 0) return 1;
  if (successes <= 0) return 1;
  if (successes >= population) return 0;
  if (draws > population) return 0;

  let probability = 1;
  for (let i = 0; i < draws; i++) {
    probability *= (population - successes - i) / (population - i);
    if (probability <= 0) return 0;
  }
  return probability;
}

/** The chance of seeing at least one of them. */
export function chanceOfAtLeastOne(
  population: number,
  successes: number,
  draws: number,
): number {
  return 1 - chanceOfNone(population, successes, draws);
}

export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

// =============================================================================
// Grouping — the binder
// =============================================================================

export type DeckSection = "Pokemon" | "Trainer" | "Energy";

export interface DeckGroup {
  id: string;
  label: string;
  /** Which of the three piles this group belongs to. */
  section: DeckSection;
  /** An energy colour, where the group is one. */
  color?: string;
  /** Total cards, counting copies. */
  count: number;
  entries: DeckEntry[];
}

export function sectionOf(card: DeckCard): DeckSection {
  if (isPokemon(card)) return "Pokemon";
  if (isTrainer(card)) return "Trainer";
  if (isEnergy(card)) return "Energy";
  // A card TCGdex has not categorised is still a card in the deck; Trainers
  // are far and away the likeliest, and it shows up in its own group anyway.
  return "Trainer";
}

const STAGE_ORDER: PokemonStage[] = [
  "Basic",
  "Stage 1",
  "Stage 2",
  "VMAX",
  "VSTAR",
  "MEGA",
  "BREAK",
  "Level Up",
  "Restored",
  "Evolution",
];

const TRAINER_ORDER: TrainerKind[] = [
  "Supporter",
  "Item",
  "Tool",
  "Stadium",
  "Trainer",
];

/** Cards within a group read in the order a deck list writes them. */
function sortEntries(entries: DeckEntry[]): DeckEntry[] {
  return [...entries].sort(
    (a, b) =>
      b.count - a.count ||
      a.card.name.localeCompare(b.card.name) ||
      a.card.id.localeCompare(b.card.id),
  );
}

function makeGroup(
  id: string,
  label: string,
  section: DeckSection,
  entries: DeckEntry[],
  color?: string,
  /** Keeps the order given, for a group whose order is the point of it. */
  keepOrder = false,
): DeckGroup {
  return {
    id,
    label,
    section,
    color,
    count: countOf(entries),
    entries: keepOrder ? [...entries] : sortEntries(entries),
  };
}

/**
 * The deck as a binder: every card filed under the heading it belongs to, in
 * the order those headings appear on a deck list. Grouping is automatic because
 * a deck list has one correct arrangement — Pokemon by stage, Trainers by what
 * they are, Energy by whether it is Basic — and hunting for a card in an
 * arbitrary pile is how counts get miscounted.
 */
export function groupDeck(
  deck: Deck,
  grouping: DeckGrouping,
  energyColors: Record<string, string>,
): DeckGroup[] {
  const entries = deck.entries;

  if (grouping === "energy-type") {
    const groups: DeckGroup[] = [];

    for (const type of TCG_ENERGY_TYPES) {
      const matching = entries.filter(
        (entry) => isPokemon(entry.card) && entry.card.types?.includes(type),
      );
      if (matching.length > 0) {
        groups.push(
          makeGroup(
            `type-${type}`,
            type,
            "Pokemon",
            matching,
            energyColors[type],
          ),
        );
      }
    }

    const typeless = entries.filter(
      (entry) =>
        isPokemon(entry.card) &&
        !entry.card.types?.some((type) =>
          (TCG_ENERGY_TYPES as readonly string[]).includes(type),
        ),
    );
    if (typeless.length > 0) {
      groups.push(
        makeGroup("type-other", "Other Pokemon", "Pokemon", typeless),
      );
    }

    const trainers = entries.filter((entry) => isTrainer(entry.card));
    if (trainers.length > 0) {
      groups.push(makeGroup("trainers", "Trainers", "Trainer", trainers));
    }

    const energy = entries.filter((entry) => isEnergy(entry.card));
    if (energy.length > 0) {
      groups.push(makeGroup("energy", "Energy", "Energy", energy));
    }

    return groups;
  }

  if (grouping === "evolution-line") {
    const pokemon = entries.filter((entry) => isPokemon(entry.card));
    const lines = new Map<string, DeckEntry[]>();

    for (const entry of pokemon) {
      const base = lineBaseName(entry.card, pokemon);
      const bucket = lines.get(base);
      if (bucket) bucket.push(entry);
      else lines.set(base, [entry]);
    }

    const groups = [...lines.entries()]
      .map(([base, lineEntries]) =>
        makeGroup(
          `line-${base}`,
          titleCase(base),
          "Pokemon",
          // A line reads bottom up: the Basic, then what it becomes. That
          // order is the whole point of this view, so it survives grouping.
          [...lineEntries].sort(
            (a, b) =>
              STAGE_ORDER.indexOf(pokemonStage(a.card)) -
                STAGE_ORDER.indexOf(pokemonStage(b.card)) ||
              a.card.name.localeCompare(b.card.name),
          ),
          undefined,
          true,
        ),
      )
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const trainers = entries.filter((entry) => isTrainer(entry.card));
    if (trainers.length > 0) {
      groups.push(makeGroup("trainers", "Trainers", "Trainer", trainers));
    }

    const energy = entries.filter((entry) => isEnergy(entry.card));
    if (energy.length > 0) {
      groups.push(makeGroup("energy", "Energy", "Energy", energy));
    }

    return groups;
  }

  // Card type — the deck list's own arrangement.
  const groups: DeckGroup[] = [];

  for (const stage of STAGE_ORDER) {
    const matching = entries.filter(
      (entry) => isPokemon(entry.card) && pokemonStage(entry.card) === stage,
    );
    if (matching.length > 0) {
      groups.push(makeGroup(`stage-${stage}`, stage, "Pokemon", matching));
    }
  }

  for (const kind of TRAINER_ORDER) {
    const matching = entries.filter(
      (entry) => isTrainer(entry.card) && trainerKind(entry.card) === kind,
    );
    if (matching.length > 0) {
      groups.push(
        makeGroup(
          `trainer-${kind}`,
          kind === "Trainer" ? "Other Trainers" : `${kind}s`,
          "Trainer",
          matching,
        ),
      );
    }
  }

  const basicEnergy = entries.filter((entry) => isBasicEnergy(entry.card));
  if (basicEnergy.length > 0) {
    groups.push(
      makeGroup("energy-basic", "Basic Energy", "Energy", basicEnergy),
    );
  }

  const specialEnergy = entries.filter((entry) => isSpecialEnergy(entry.card));
  if (specialEnergy.length > 0) {
    groups.push(
      makeGroup("energy-special", "Special Energy", "Energy", specialEnergy),
    );
  }

  const uncategorised = entries.filter(
    (entry) =>
      !isPokemon(entry.card) && !isTrainer(entry.card) && !isEnergy(entry.card),
  );
  if (uncategorised.length > 0) {
    groups.push(makeGroup("other", "Other", "Trainer", uncategorised));
  }

  return groups;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Walks a Pokemon down its `evolveFrom` chain to whatever the deck starts it at. */
function lineBaseName(card: DeckCard, pool: DeckEntry[]): string {
  let current = card;
  const seen = new Set<string>();

  while (current.evolveFrom) {
    const from = current.evolveFrom.trim().toLowerCase();
    if (seen.has(from)) break;
    seen.add(from);
    const previous = pool.find(
      (entry) => entry.card.name.trim().toLowerCase() === from,
    );
    // The card it evolves from is not in the deck, so this is where the line
    // starts as far as the deck is concerned. Naming the line after a card
    // nobody is playing would file it under a heading that is not there — the
    // missing step is reported as its own gap instead.
    if (!previous) break;
    current = previous.card;
  }

  return current.name.trim().toLowerCase();
}

// =============================================================================
// Evolution lines
// =============================================================================

export interface EvolutionStep {
  name: string;
  stage: PokemonStage;
  count: number;
  evolveFrom?: string;
  cardIds: string[];
}

export interface EvolutionLine {
  base: string;
  steps: EvolutionStep[];
  /** A step outnumbering what it evolves from — the classic dead-card list. */
  topHeavy: boolean;
  hasStageTwo: boolean;
}

/**
 * The evolution lines in the deck, each with the counts a player would write as
 * "4-3-3". A line where the Stage 2 outnumbers the Basic under it is the single
 * most common fault in a first draft: the extra copies cannot be played.
 */
export function evolutionLines(deck: Deck): EvolutionLine[] {
  const pokemon = deck.entries.filter((entry) => isPokemon(entry.card));
  if (pokemon.length === 0) return [];

  // Copies of a name can come from several sets; the line counts the name.
  const byName = new Map<string, EvolutionStep>();
  for (const entry of pokemon) {
    const key = entry.card.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      existing.count += entry.count;
      existing.cardIds.push(entry.card.id);
    } else {
      byName.set(key, {
        name: entry.card.name,
        stage: pokemonStage(entry.card),
        count: entry.count,
        evolveFrom: entry.card.evolveFrom,
        cardIds: [entry.card.id],
      });
    }
  }

  const lines = new Map<string, EvolutionStep[]>();
  for (const entry of pokemon) {
    const base = lineBaseName(entry.card, pokemon);
    const step = byName.get(entry.card.name.trim().toLowerCase());
    if (!step) continue;
    const bucket = lines.get(base);
    if (!bucket) lines.set(base, [step]);
    else if (!bucket.includes(step)) bucket.push(step);
  }

  return [...lines.entries()]
    .map(([base, steps]) => {
      const ordered = [...steps].sort(
        (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage),
      );

      const topHeavy = ordered.some((step) => {
        if (!step.evolveFrom) return false;
        const from = ordered.find(
          (candidate) =>
            candidate.name.trim().toLowerCase() ===
            step.evolveFrom?.trim().toLowerCase(),
        );
        // Nothing to evolve from at all is reported separately, as a gap.
        return from ? step.count > from.count : false;
      });

      return {
        base: titleCase(base),
        steps: ordered,
        topHeavy,
        hasStageTwo: ordered.some((step) => step.stage === "Stage 2"),
      };
    })
    .sort((a, b) => a.base.localeCompare(b.base));
}

// =============================================================================
// Analysis
// =============================================================================

export interface EnergyDemand {
  type: string;
  /** Copies of Pokemon in the deck whose attacks ask for this energy. */
  copies: number;
  /** Whether the deck plays an energy card that can pay for it. */
  supplied: boolean;
}

export interface DeckAnalysis {
  total: number;
  /** How many cards are still to be found. Negative means the deck is over. */
  remaining: number;
  pokemon: number;
  trainer: number;
  energy: number;
  trainers: Record<TrainerKind, number>;
  basicEnergy: number;
  specialEnergy: number;
  basicPokemon: number;
  /** The chance of opening with no Basic Pokemon, once the deck is full. */
  mulliganOdds: number | null;
  ruleBox: number;
  aceSpec: number;
  radiant: number;
  energyDemand: EnergyDemand[];
  /** Energy types the deck's Pokemon are, for a Pocket Energy Zone or GLC. */
  pokemonTypes: { type: string; count: number }[];
  weaknesses: { type: string; count: number }[];
  lines: EvolutionLine[];
  retreat: { average: number | null; free: number; heavy: number };
  averageHp: number | null;
  /** Cards that let a deck get out of a bad Active, by name. */
  switchingCards: number;
  drawSupporters: number;
}

/**
 * Names that do the two jobs a deck cannot function without: drawing more cards
 * and getting out of the Active spot. Matching by name is crude, but these are
 * the cards every list runs, and naming them is what turns "34 Trainers" into
 * "34 Trainers and no way to retreat".
 */
const SWITCHING_CARDS =
  /\b(switch|switch cart|escape rope|air balloon|bird keeper|guzma|pokemon catcher|scoop up|counter catcher|jet energy|switching cups|prime catcher|luminous energy|x speed|leaf)\b/i;

const DRAW_SUPPORTERS =
  /\b(professor|research|iono|marnie|cynthia|colress|juniper|sycamore|hop|bianca|shauna|lillie|cheren|erika|arven|judge|roseanne|copycat|jacq|crispin|drayton|lance|steven|kieran|hilda|nemona)\b/i;

export function analyzeDeck(deck: Deck, format: DeckFormat): DeckAnalysis {
  const entries = deck.entries;
  const total = countOf(entries);

  const trainers: Record<TrainerKind, number> = {
    Supporter: 0,
    Item: 0,
    Tool: 0,
    Stadium: 0,
    Trainer: 0,
  };
  for (const entry of entries) {
    if (isTrainer(entry.card)) {
      trainers[trainerKind(entry.card)] += entry.count;
    }
  }

  const basicPokemon = countOf(entries, isBasicPokemon);

  // The mulligan number only means anything against a full deck: half a deck
  // would report odds nobody will ever draw against. Pocket deals a Basic in
  // every opening hand, so there is no mulligan there to report at all.
  const mulliganOdds =
    total >= format.deckSize && !format.guaranteedOpeningBasic
      ? chanceOfNone(total, basicPokemon, format.openingHand)
      : null;

  const typeCounts = new Map<string, number>();
  const weaknessCounts = new Map<string, number>();
  let retreatTotal = 0;
  let retreatCards = 0;
  let free = 0;
  let heavy = 0;
  let hpTotal = 0;
  let hpCards = 0;

  for (const entry of entries) {
    if (!isPokemon(entry.card)) continue;

    for (const type of entry.card.types ?? []) {
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + entry.count);
    }
    for (const weakness of entry.card.weaknesses ?? []) {
      weaknessCounts.set(
        weakness.type,
        (weaknessCounts.get(weakness.type) ?? 0) + entry.count,
      );
    }
    if (typeof entry.card.retreat === "number") {
      retreatTotal += entry.card.retreat * entry.count;
      retreatCards += entry.count;
      if (entry.card.retreat === 0) free += entry.count;
      if (entry.card.retreat >= 3) heavy += entry.count;
    }
    if (typeof entry.card.hp === "number") {
      hpTotal += entry.card.hp * entry.count;
      hpCards += entry.count;
    }
  }

  return {
    total,
    remaining: format.deckSize - total,
    pokemon: countOf(entries, isPokemon),
    trainer: countOf(entries, isTrainer),
    energy: countOf(entries, isEnergy),
    trainers,
    basicEnergy: countOf(entries, isBasicEnergy),
    specialEnergy: countOf(entries, isSpecialEnergy),
    basicPokemon,
    mulliganOdds,
    ruleBox: countOf(entries, hasRuleBox),
    aceSpec: countOf(entries, isAceSpec),
    radiant: countOf(entries, isRadiant),
    energyDemand: energyDemand(deck, format),
    pokemonTypes: [...typeCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    weaknesses: [...weaknessCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    lines: evolutionLines(deck),
    retreat: {
      average: retreatCards > 0 ? retreatTotal / retreatCards : null,
      free,
      heavy,
    },
    averageHp: hpCards > 0 ? hpTotal / hpCards : null,
    switchingCards: countOf(entries, (card) => SWITCHING_CARDS.test(card.name)),
    drawSupporters: countOf(
      entries,
      (card) =>
        isTrainer(card) &&
        trainerKind(card) === "Supporter" &&
        DRAW_SUPPORTERS.test(card.name),
    ),
  };
}

/**
 * The energy the deck's attacks actually ask for, against what it can pay with.
 * Colorless is left out: any energy pays it, so it never decides an energy line.
 */
export function energyDemand(deck: Deck, format: DeckFormat): EnergyDemand[] {
  const demand = new Map<string, number>();

  for (const entry of deck.entries) {
    if (!isPokemon(entry.card)) continue;
    const needed = new Set<string>();
    for (const attack of entry.card.attacks ?? []) {
      for (const cost of attack.cost ?? []) {
        if (!cost || /colorless|free/i.test(cost)) continue;
        needed.add(cost);
      }
    }
    for (const type of needed) {
      demand.set(type, (demand.get(type) ?? 0) + entry.count);
    }
  }

  // In Pocket the energy comes from the Energy Zone rather than the deck, so
  // what a deck can pay for is decided by the types it registers — up to three.
  if (!format.usesEnergyCards) {
    const ranked = [...demand.entries()].sort((a, b) => b[1] - a[1]);
    const zone = new Set(
      ranked
        .slice(0, format.maxEnergyZoneTypes ?? ranked.length)
        .map(([type]) => type),
    );
    return ranked.map(([type, copies]) => ({
      type,
      copies,
      supplied: zone.has(type),
    }));
  }

  const supplied = new Set<string>();
  for (const entry of deck.entries) {
    const type = energyCardType(entry.card);
    if (type) supplied.add(type);
  }
  // A Special Energy that provides any type cannot be read off the card's
  // fields, so a deck playing one is given the benefit of the doubt.
  const hasSpecial = deck.entries.some((entry) => isSpecialEnergy(entry.card));

  return [...demand.entries()]
    .map(([type, copies]) => ({
      type,
      copies,
      supplied: supplied.has(type) || hasSpecial,
    }))
    .sort((a, b) => b.copies - a.copies);
}

// =============================================================================
// Legality
// =============================================================================

/** "An Expanded deck", "A Standard deck" — the format names decide. */
function article(name: string): string {
  return /^[aeiou]/i.test(name) ? "An" : "A";
}

export type DeckIssueLevel = "error" | "warning" | "note";

export interface DeckIssue {
  id: string;
  level: DeckIssueLevel;
  title: string;
  detail?: string;
  /** Cards the issue is about, so the binder can point straight at them. */
  cardIds?: string[];
}

export interface DeckPoolContext {
  /** Regulation marks Standard currently allows. */
  standardMarks: string[];
  /** Set ids the Expanded pool is made of, where they are known. */
  expandedSetIds: string[];
  /** Set ids belonging to Pocket. */
  pocketSetIds: string[];
}

export const EMPTY_POOL_CONTEXT: DeckPoolContext = {
  standardMarks: standardRegulationMarks(),
  expandedSetIds: [],
  pocketSetIds: [],
};

/**
 * Whether a card may be played in this format at all, and why not when it may
 * not. Judged from what is printed on the card: the regulation mark for
 * Standard, the set for Expanded, the rule box for Gym Leader Challenge.
 */
export function cardPoolReason(
  card: DeckCard,
  format: DeckFormat,
  context: DeckPoolContext,
): string | null {
  const isPocketCard = context.pocketSetIds.some(
    (setId) => setId.toLowerCase() === card.setId.toLowerCase(),
  );

  if (format.game === "pocket" && !isPocketCard) {
    return "Not a Pokemon TCG Pocket card";
  }
  if (format.game === "tcg" && isPocketCard) {
    return "Pocket cards cannot be played in the physical game";
  }

  if (!format.usesEnergyCards && isEnergy(card)) {
    return "Energy cards are not part of a Pocket deck — energy comes from the Energy Zone";
  }

  // Basic Energy is legal in every format whatever set it was printed in, and
  // most printings carry no regulation mark at all. Without this exemption the
  // one card every deck in the game plays would read as rotated out.
  if (isBasicEnergy(card)) return null;

  if (format.pool === "standard") {
    const mark = (card.regulationMark ?? "").toUpperCase();
    if (!mark) {
      // Older cards have no mark at all, which is itself the answer.
      return card.legal?.standard
        ? null
        : "No regulation mark — rotated out of Standard";
    }
    if (!context.standardMarks.includes(mark)) {
      return `Regulation ${mark} has rotated out of Standard`;
    }
  }

  if (format.pool === "expanded" && context.expandedSetIds.length > 0) {
    const inPool = context.expandedSetIds.some(
      (setId) => setId.toLowerCase() === card.setId.toLowerCase(),
    );
    if (!inPool) return "Printed before Black & White — outside Expanded";
  }

  // An ACE SPEC carries a rule box, so both tests catch one. Naming the ACE
  // SPEC rule is the more useful of the two answers.
  if (format.maxAceSpec === 0 && isAceSpec(card)) {
    return "ACE SPEC cards are not allowed in this format";
  }

  if (!format.ruleBoxAllowed && hasRuleBox(card)) {
    return "Rule box cards are not allowed in this format";
  }

  return bannedCardReason(card.name, card.setId, format.id);
}

/**
 * How many more copies of this card the deck may take. Basic Energy is
 * uncapped where the format says so, which is why a list can run nine of it.
 */
export function copiesAllowed(
  card: DeckCard,
  deck: Deck,
  format: DeckFormat,
): number {
  if (format.basicEnergyUncapped && isBasicEnergy(card)) {
    return Math.max(0, format.deckSize - deckSize(deck));
  }

  const name = copyLimitName(card);
  const played = deck.entries.reduce(
    (total, entry) =>
      total + (copyLimitName(entry.card) === name ? entry.count : 0),
    0,
  );

  let limit = format.maxCopies;
  if (isAceSpec(card)) limit = Math.min(limit, format.maxAceSpec);
  if (isRadiant(card)) limit = Math.min(limit, format.maxRadiant);
  if (isPrismStar(card)) limit = Math.min(limit, format.maxPrismStarPerName);

  // ACE SPEC and Radiant are one per deck rather than one per name, so the
  // other cards of the kind already in the deck spend the allowance too.
  if (isAceSpec(card)) {
    const aceSpecs = countOf(deck.entries, isAceSpec);
    return Math.max(0, Math.min(limit - played, format.maxAceSpec - aceSpecs));
  }
  if (isRadiant(card)) {
    const radiants = countOf(deck.entries, isRadiant);
    return Math.max(0, Math.min(limit - played, format.maxRadiant - radiants));
  }

  return Math.max(0, limit - played);
}

/**
 * Everything wrong with the deck, worst first: the rules that make it
 * unplayable, then the counts that make it unreliable, then the notes a player
 * would want a second look at.
 */
export function validateDeck(
  deck: Deck,
  format: DeckFormat,
  analysis: DeckAnalysis,
  context: DeckPoolContext = EMPTY_POOL_CONTEXT,
): DeckIssue[] {
  const issues: DeckIssue[] = [];
  const { total } = analysis;

  // --- Rules -----------------------------------------------------------------

  if (total !== format.deckSize) {
    issues.push({
      id: "deck-size",
      level: "error",
      title:
        total < format.deckSize
          ? `${format.deckSize - total} more card${format.deckSize - total === 1 ? "" : "s"} needed`
          : `${total - format.deckSize} card${total - format.deckSize === 1 ? "" : "s"} over`,
      detail: `${article(format.name)} ${format.name} deck is exactly ${format.deckSize} cards. This one has ${total}.`,
    });
  }

  if (analysis.basicPokemon === 0) {
    issues.push({
      id: "no-basic",
      level: "error",
      title: "No Basic Pokemon",
      detail:
        "A deck has to be able to start. Every game opens by putting a Basic Pokemon into the Active spot.",
    });
  }

  // Copy limits, counted by printed name across every set it was printed in.
  const byName = new Map<string, { count: number; cards: DeckCard[] }>();
  for (const entry of deck.entries) {
    if (format.basicEnergyUncapped && isBasicEnergy(entry.card)) continue;
    const name = copyLimitName(entry.card);
    const bucket = byName.get(name);
    if (bucket) {
      bucket.count += entry.count;
      bucket.cards.push(entry.card);
    } else {
      byName.set(name, { count: entry.count, cards: [entry.card] });
    }
  }

  for (const [, bucket] of byName) {
    if (bucket.count > format.maxCopies) {
      const card = bucket.cards[0];
      issues.push({
        id: `copies-${card.id}`,
        level: "error",
        title: `${bucket.count} copies of ${card.name}`,
        detail:
          format.maxCopies === 1
            ? `${format.name} is a singleton format — one copy of a card, and any number of Basic Energy.`
            : `A deck may hold at most ${format.maxCopies} cards with the same name.`,
        cardIds: bucket.cards.map((entry) => entry.id),
      });
    }
  }

  if (analysis.aceSpec > format.maxAceSpec) {
    const aceSpecs = entriesOf(deck, isAceSpec);
    issues.push({
      id: "ace-spec",
      level: "error",
      title:
        format.maxAceSpec === 0
          ? `${analysis.aceSpec} ACE SPEC card${analysis.aceSpec === 1 ? "" : "s"}`
          : `${analysis.aceSpec} ACE SPEC cards`,
      detail:
        format.maxAceSpec === 0
          ? `${format.name} does not allow ACE SPEC cards.`
          : "A deck may hold one ACE SPEC card in total, whatever its name.",
      cardIds: aceSpecs.map((entry) => entry.card.id),
    });
  }

  if (analysis.radiant > format.maxRadiant) {
    const radiants = entriesOf(deck, isRadiant);
    issues.push({
      id: "radiant",
      level: "error",
      title: `${analysis.radiant} Radiant Pokemon`,
      detail:
        format.maxRadiant === 0
          ? `${format.name} does not allow Radiant Pokemon — they carry a rule box.`
          : "A deck may hold one Radiant Pokemon in total, whatever its name.",
      cardIds: radiants.map((entry) => entry.card.id),
    });
  }

  const outOfPool = deck.entries.filter(
    (entry) => cardPoolReason(entry.card, format, context) !== null,
  );
  if (outOfPool.length > 0) {
    // Each card says why it cannot be played rather than the list saying that
    // some of them cannot: "rotated out" and "banned" are different problems
    // with different fixes.
    const named = outOfPool
      .slice(0, 3)
      .map(
        (entry) =>
          `${entry.card.name}: ${cardPoolReason(entry.card, format, context)}`,
      );
    const rest = outOfPool.length - named.length;

    issues.push({
      id: "pool",
      level: "error",
      title: `${countOf(outOfPool)} card${countOf(outOfPool) === 1 ? "" : "s"} ${format.name} will not have`,
      detail: `${named.join("; ")}${rest > 0 ? `; and ${rest} more` : ""}.`,
      cardIds: outOfPool.map((entry) => entry.card.id),
    });
  }

  if (format.singleTypeOnly) {
    const types = analysis.pokemonTypes.filter((entry) => entry.count > 0);
    if (types.length > 1) {
      issues.push({
        id: "single-type",
        level: "error",
        title: `${types.length} energy types among the Pokemon`,
        detail: `${format.name} decks play Pokemon of a single type — this one has ${types
          .map((entry) => entry.type)
          .join(", ")}.`,
      });
    }
  }

  // --- Consistency -----------------------------------------------------------

  if (
    analysis.basicPokemon > 0 &&
    analysis.basicPokemon < format.guidance.basicPokemonMin
  ) {
    issues.push({
      id: "few-basics",
      level: "warning",
      title: `Only ${analysis.basicPokemon} Basic Pokemon`,
      detail: format.guaranteedOpeningBasic
        ? // Pocket deals a Basic every game, so the risk is not opening on
          // nothing — it is having nothing to put on the Bench behind it.
          `The opening hand always holds one, but ${format.name} lists play at least ${format.guidance.basicPokemonMin} so there is something to fill the Bench with.`
        : analysis.mulliganOdds !== null
          ? `That is a ${formatPercent(analysis.mulliganOdds, 1)} chance of opening with none and having to mulligan. Most lists play at least ${format.guidance.basicPokemonMin}.`
          : `Most ${format.name} lists play at least ${format.guidance.basicPokemonMin} so they can open on one reliably.`,
    });
  }

  for (const line of analysis.lines) {
    if (line.topHeavy) {
      const step = line.steps.find((candidate) => {
        const from = line.steps.find(
          (other) =>
            other.name.trim().toLowerCase() ===
            candidate.evolveFrom?.trim().toLowerCase(),
        );
        return from ? candidate.count > from.count : false;
      });
      if (!step) continue;
      const from = line.steps.find(
        (other) =>
          other.name.trim().toLowerCase() ===
          step.evolveFrom?.trim().toLowerCase(),
      );
      issues.push({
        id: `line-${line.base}`,
        level: "warning",
        title: `${line.base} line is top heavy`,
        detail: `${step.count} ${step.name} over ${from?.count ?? 0} ${from?.name ?? step.evolveFrom} — the extra copies have nothing to evolve from.`,
        cardIds: step.cardIds,
      });
    }

    const missing = line.steps.filter(
      (step) =>
        step.evolveFrom &&
        !line.steps.some(
          (other) =>
            other.name.trim().toLowerCase() ===
            step.evolveFrom?.trim().toLowerCase(),
        ),
    );
    for (const step of missing) {
      issues.push({
        id: `gap-${step.name}`,
        level: "warning",
        title: `No ${step.evolveFrom} for ${step.name}`,
        detail: `${step.name} evolves from ${step.evolveFrom}, which is not in the deck.`,
        cardIds: step.cardIds,
      });
    }
  }

  const hasRareCandy = deck.entries.some((entry) =>
    /rare candy/i.test(entry.card.name),
  );
  const stageTwoLines = analysis.lines.filter((line) => line.hasStageTwo);
  // Pocket has no Rare Candy — evolutions are played one stage at a time
  // there — so the note only belongs to the physical game.
  if (format.game === "tcg" && stageTwoLines.length > 0 && !hasRareCandy) {
    issues.push({
      id: "rare-candy",
      level: "note",
      title: "Stage 2 line without Rare Candy",
      detail:
        "Rare Candy skips the Stage 1, which is how a Stage 2 deck gets set up before turn three.",
    });
  }

  for (const demand of analysis.energyDemand) {
    if (demand.supplied) continue;
    issues.push({
      id: `energy-${demand.type}`,
      level: "warning",
      title: format.usesEnergyCards
        ? `No ${demand.type} energy in the deck`
        : `${demand.type} is outside the Energy Zone`,
      detail: format.usesEnergyCards
        ? `${demand.copies} ${demand.copies === 1 ? "card needs" : "cards need"} ${demand.type} energy to attack, and the deck plays none.`
        : `A Pocket deck registers ${format.maxEnergyZoneTypes} energy types. ${demand.copies} ${demand.copies === 1 ? "card needs" : "cards need"} ${demand.type}, which does not fit.`,
    });
  }

  if (analysis.trainers.Supporter === 0 && analysis.total > 0) {
    issues.push({
      id: "no-supporters",
      level: "warning",
      title: "No Supporters",
      detail:
        "One Supporter a turn is where a deck's card draw comes from. Without them the deck plays the cards it happens to draw.",
    });
  } else if (
    analysis.total >= format.deckSize &&
    analysis.trainers.Supporter < format.guidance.supporterRange[0]
  ) {
    issues.push({
      id: "few-supporters",
      level: "note",
      title: `${analysis.trainers.Supporter} Supporters`,
      detail: `Most ${format.name} lists sit between ${format.guidance.supporterRange[0]} and ${format.guidance.supporterRange[1]}, so there is a draw Supporter to play most turns.`,
    });
  }

  if (
    format.usesEnergyCards &&
    format.guidance.energyRange &&
    analysis.total >= format.deckSize &&
    analysis.energy > 0 &&
    analysis.energy < format.guidance.energyRange[0]
  ) {
    issues.push({
      id: "few-energy",
      level: "note",
      title: `${analysis.energy} energy`,
      detail: `Under ${format.guidance.energyRange[0]} usually means the deck is leaning on energy acceleration to keep up.`,
    });
  }

  if (
    analysis.retreat.average !== null &&
    analysis.retreat.average >= 2 &&
    analysis.switchingCards === 0 &&
    analysis.pokemon > 0
  ) {
    issues.push({
      id: "no-switching",
      level: "note",
      title: "Nothing to switch with",
      detail: `The average retreat cost here is ${analysis.retreat.average.toFixed(1)} energy and the deck plays no Switch effect — a Pokemon stuck Active stays there.`,
    });
  }

  const order: Record<DeckIssueLevel, number> = {
    error: 0,
    warning: 1,
    note: 2,
  };
  return issues.sort((a, b) => order[a.level] - order[b.level]);
}

export function isDeckLegal(issues: DeckIssue[]): boolean {
  return !issues.some((issue) => issue.level === "error");
}

// =============================================================================
// Search results
// =============================================================================

/**
 * What a card's name gives away about its mechanics. A search result is a name
 * and a scan — the fields that say whether a card carries a rule box only
 * arrive with the full card — but the printed name is where the game puts the
 * mechanic, so a Charizard ex is recognisable as one before it is fetched.
 */
export function nameSuggestsRuleBox(name: string): boolean {
  return (
    /(?:\s|-)(ex|gx|v|vmax|vstar|union)$/i.test(name.trim()) ||
    /^radiant\s/i.test(name) ||
    name.includes("◇")
  );
}

/**
 * Whether a name is one of the Basic Energy cards. A deck may play any number
 * of them, so a search result showing "9/4" would be telling a lie — and the
 * card's own fields, which would say so properly, only arrive with the card.
 */
export function nameSuggestsBasicEnergy(name: string): boolean {
  const trimmed = name.trim();
  return TCG_ENERGY_TYPES.some((type) =>
    new RegExp(`^(basic\\s+)?${type}\\s+energy$`, "i").test(trimmed),
  );
}

/**
 * Why a search result would not be playable in this format, judged from the
 * little a result carries. Standard's rotation is already applied by the search
 * itself, so what is left is the set the card is from and the mechanic its name
 * names — enough to keep an unbuildable card from looking buildable.
 */
export function briefPoolReason(
  card: { id: string; name: string },
  format: DeckFormat,
  context: DeckPoolContext,
): string | null {
  const setId = setIdFromCardId(card.id);
  const isPocketCard = context.pocketSetIds.some(
    (id) => id.toLowerCase() === setId.toLowerCase(),
  );

  if (format.game === "pocket" && !isPocketCard) return "Not a Pocket card";
  if (format.game === "tcg" && isPocketCard) return "Pocket card";

  // Basic Energy is legal everywhere, out of sets far older than the pool.
  if (format.usesEnergyCards && nameSuggestsBasicEnergy(card.name)) return null;

  if (format.pool === "expanded" && context.expandedSetIds.length > 0) {
    const inPool = context.expandedSetIds.some(
      (id) => id.toLowerCase() === setId.toLowerCase(),
    );
    if (!inPool) return "Outside Expanded";
  }

  if (!format.ruleBoxAllowed && nameSuggestsRuleBox(card.name)) {
    return "Rule box";
  }

  // A ban is by name and printing, both of which a result carries.
  return bannedCardReason(card.name, setId, format.id) ? "Banned" : null;
}

// =============================================================================
// Prize trade
// =============================================================================

/**
 * How many prizes the opponent takes for knocking this Pokemon out.
 *
 * The prize trade is the game's real scoreboard: six prizes, and a deck full of
 * two-prize attackers only has to be knocked out three times. Radiant Pokemon
 * and Prism Star cards carry a rule box but still give up one, which is exactly
 * why they see play.
 */
export function prizesGivenUp(card: DeckCard): number {
  if (!isPokemon(card)) return 0;

  const suffix = normalize(card.suffix).replace(/[\s-]/g, "");
  const name = card.name.trim();

  if (
    suffix === "vmax" ||
    suffix === "vunion" ||
    suffix.startsWith("tagteam") ||
    /[\s-]vmax$/i.test(name) ||
    /[\s-]v-?union$/i.test(name) ||
    // A Tag Team's two names are joined by an ampersand and end in GX.
    (name.includes("&") && /[\s-]gx$/i.test(name))
  ) {
    return 3;
  }

  if (isRadiant(card) || isPrismStar(card)) return 1;

  if (
    ["ex", "gx", "v", "vstar", "mega"].includes(suffix) ||
    /\s(ex|gx|v|vstar)$/i.test(name)
  ) {
    return 2;
  }

  return 1;
}

/** The deck's prize liability, as the count of Pokemon at each prize value. */
export function prizeSpread(deck: Deck): { prizes: number; count: number }[] {
  const spread = new Map<number, number>();
  for (const entry of deck.entries) {
    if (!isPokemon(entry.card)) continue;
    const prizes = prizesGivenUp(entry.card);
    spread.set(prizes, (spread.get(prizes) ?? 0) + entry.count);
  }
  return [...spread.entries()]
    .map(([prizes, count]) => ({ prizes, count }))
    .sort((a, b) => b.prizes - a.prizes);
}
