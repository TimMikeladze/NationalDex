/**
 * Checks the deck formats against the rules they claim to enforce.
 *
 * The rule sets are data — deck sizes, copy limits, the Standard rotation, the
 * Expanded ban list — and data drifts: a rotation lands every April, a ban list
 * changes by announcement. This walks the whole matrix and says so out loud, so
 * "is the builder still right about Standard" is one command rather than a
 * reading of five tables.
 *
 * bun run check:deck-rules
 */

import {
  analyzeDeck,
  briefPoolReason,
  cardPoolReason,
  chanceOfAtLeastOne,
  copiesAllowed,
  type DeckPoolContext,
  hasRuleBox,
  isBasicPokemon,
  prizesGivenUp,
  validateDeck,
} from "../src/lib/deck";
import type { Deck, DeckCard, DeckFormatId } from "../src/types/deck";
import {
  bannedCardReason,
  DECK_FORMATS,
  deckFormat,
  standardRegulationMarks,
} from "../src/types/deck";

let failures = 0;
let checks = 0;

function check(what: string, actual: unknown, expected: unknown) {
  checks++;
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    failures++;
    console.error(`  ✗ ${what}\n      expected ${b}\n      got      ${a}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

function card(overrides: Partial<DeckCard> & { name: string }): DeckCard {
  return {
    id: `${overrides.setId ?? "sv3"}-1`,
    localId: "1",
    category: "Pokemon",
    setId: "sv3",
    setName: "Test Set",
    regulationMark: "H",
    ...overrides,
  };
}

function deck(entries: [DeckCard, number][], formatId: DeckFormatId): Deck {
  return {
    id: "test",
    name: "Test",
    formatId,
    language: "en",
    entries: entries.map(([deckCard, count], index) => ({
      card: { ...deckCard, id: `${deckCard.id}-${index}` },
      count,
      addedAt: 0,
    })),
    createdAt: 0,
    updatedAt: 0,
  };
}

const POOL: DeckPoolContext = {
  standardMarks: ["H", "I", "J"],
  expandedSetIds: [
    "bw1",
    "bw3",
    "bw5",
    "xy4",
    "xy6",
    "xy7",
    "sm4",
    "sm35",
    "sm10",
    "sv3",
  ],
  pocketSetIds: ["A1", "A2"],
};

// =============================================================================

section("Deck construction rules, per format");

for (const [id, format] of Object.entries(DECK_FORMATS)) {
  check(`${id}: deck size`, format.deckSize, id === "pocket" ? 20 : 60);
  check(
    `${id}: copies of a name`,
    format.maxCopies,
    id === "pocket" ? 2 : id === "glc" ? 1 : 4,
  );
  check(`${id}: opening hand`, format.openingHand, id === "pocket" ? 5 : 7);
  check(`${id}: prize cards`, format.prizeCount, id === "pocket" ? 0 : 6);
}

// The physical game: four copies, one ACE SPEC, one Radiant, energy uncapped.
for (const id of ["standard", "expanded", "unlimited"] as DeckFormatId[]) {
  const format = DECK_FORMATS[id];
  check(`${id}: ACE SPEC per deck`, format.maxAceSpec, 1);
  check(`${id}: Radiant per deck`, format.maxRadiant, 1);
  check(`${id}: Prism Star per name`, format.maxPrismStarPerName, 1);
  check(`${id}: Basic Energy uncapped`, format.basicEnergyUncapped, true);
  check(`${id}: rule boxes allowed`, format.ruleBoxAllowed, true);
  check(`${id}: single type`, format.singleTypeOnly, false);
  check(`${id}: can mulligan`, format.guaranteedOpeningBasic, false);
  check(`${id}: uses prize cards`, format.usesPrizeCards, true);
}

// Gym Leader Challenge: singleton, one type, nothing with a rule box.
const glc = DECK_FORMATS.glc;
check("glc: singleton", glc.maxCopies, 1);
check("glc: Basic Energy still uncapped", glc.basicEnergyUncapped, true);
check("glc: no rule boxes", glc.ruleBoxAllowed, false);
check("glc: no ACE SPEC", glc.maxAceSpec, 0);
check("glc: no Radiant", glc.maxRadiant, 0);
check("glc: single type", glc.singleTypeOnly, true);
check("glc: Expanded card pool", glc.pool, "expanded");

// Pocket: twenty cards, two copies, no energy cards, points not prizes.
const pocket = DECK_FORMATS.pocket;
check("pocket: no energy cards in the deck", pocket.usesEnergyCards, false);
check("pocket: energy zone types", pocket.maxEnergyZoneTypes, 3);
check("pocket: no prize cards", pocket.usesPrizeCards, false);
check("pocket: points to win", pocket.pointsToWin, 3);
check(
  "pocket: opening hand always holds a Basic",
  pocket.guaranteedOpeningBasic,
  true,
);

// =============================================================================

section("Standard rotation");

const rotations: [string, string[]][] = [
  ["2022-06-01", ["D", "E", "F"]],
  ["2023-06-01", ["E", "F", "G"]],
  ["2024-06-01", ["F", "G", "H"]],
  ["2025-06-01", ["G", "H", "I"]],
  ["2026-06-01", ["H", "I", "J"]],
];

for (const [date, marks] of rotations) {
  check(
    `marks legal on ${date}`,
    standardRegulationMarks([], new Date(date)),
    marks,
  );
}

check(
  "a mark shipping mid-season is legal",
  standardRegulationMarks(["H", "I", "J", "K"], new Date("2026-06-01")),
  ["H", "I", "J", "K"],
);
check(
  "a rotated mark stays out",
  standardRegulationMarks(["F", "G", "H", "I"], new Date("2026-06-01")),
  ["H", "I", "J"],
);
check(
  "the day before a rotation still holds the old run",
  standardRegulationMarks([], new Date("2026-04-09")),
  ["G", "H", "I"],
);

// =============================================================================

section("Copy limits");

const iono = card({
  name: "Iono",
  category: "Trainer",
  trainerType: "Supporter",
});
const fireEnergy = card({
  name: "Basic Fire Energy",
  category: "Energy",
  energyType: "Basic",
});
const specialEnergy = card({
  name: "Jet Energy",
  category: "Energy",
  energyType: "Special",
});
const aceSpec = card({
  name: "Prime Catcher",
  category: "Trainer",
  trainerType: "Item",
  rarity: "ACE SPEC Rare",
});
const otherAceSpec = card({
  name: "Hero's Cape",
  category: "Trainer",
  trainerType: "Tool",
  rarity: "ACE SPEC Rare",
});
const radiant = card({ name: "Radiant Greninja", stage: "Basic" });
const otherRadiant = card({ name: "Radiant Alakazam", stage: "Basic" });

check(
  "a fourth Iono fits, a fifth does not",
  copiesAllowed(iono, deck([[iono, 4]], "standard"), DECK_FORMATS.standard),
  0,
);
check(
  "three Iono leaves room for one",
  copiesAllowed(iono, deck([[iono, 3]], "standard"), DECK_FORMATS.standard),
  1,
);
check(
  "Basic Energy is capped only by the deck size",
  copiesAllowed(
    fireEnergy,
    deck([[fireEnergy, 20]], "standard"),
    DECK_FORMATS.standard,
  ),
  40,
);
check(
  "Special Energy is not exempt",
  copiesAllowed(
    specialEnergy,
    deck([[specialEnergy, 4]], "standard"),
    DECK_FORMATS.standard,
  ),
  0,
);
check(
  "a second ACE SPEC is refused even under another name",
  copiesAllowed(
    otherAceSpec,
    deck([[aceSpec, 1]], "standard"),
    DECK_FORMATS.standard,
  ),
  0,
);
check(
  "a second Radiant is refused even under another name",
  copiesAllowed(
    otherRadiant,
    deck([[radiant, 1]], "standard"),
    DECK_FORMATS.standard,
  ),
  0,
);
check(
  "GLC takes one of a card",
  copiesAllowed(iono, deck([], "glc"), DECK_FORMATS.glc),
  1,
);
check(
  "GLC still takes any number of Basic Energy",
  copiesAllowed(fireEnergy, deck([[fireEnergy, 9]], "glc"), DECK_FORMATS.glc),
  51,
);
check(
  "Pocket takes two of a card",
  copiesAllowed(iono, deck([], "pocket"), DECK_FORMATS.pocket),
  2,
);

// =============================================================================

section("Rule boxes and the prize trade");

const ruleBoxCases: [DeckCard, boolean, number][] = [
  [card({ name: "Charmander", stage: "Basic" }), false, 1],
  [card({ name: "Charizard ex", suffix: "ex", stage: "Stage2" }), true, 2],
  [card({ name: "Mewtwo V", suffix: "V", stage: "Basic" }), true, 2],
  [card({ name: "Charizard VMAX", suffix: "VMAX" }), true, 3],
  [card({ name: "Arceus VSTAR", suffix: "VSTAR" }), true, 2],
  [card({ name: "Pikachu & Zekrom-GX", suffix: "TAG TEAM" }), true, 3],
  [card({ name: "Gardevoir-GX", suffix: "GX" }), true, 2],
  [card({ name: "M Rayquaza EX", suffix: "MEGA" }), true, 2],
  [card({ name: "Mewtwo V-UNION" }), true, 3],
  [card({ name: "Radiant Greninja" }), true, 1],
  [card({ name: "Greninja BREAK", stage: "BREAK" }), false, 1],
  [card({ name: "Solgaleo ◇", suffix: "Prism Star" }), true, 1],
  [iono, false, 0],
  [aceSpec, true, 0],
];

for (const [subject, ruleBox, prizes] of ruleBoxCases) {
  check(`${subject.name}: rule box`, hasRuleBox(subject), ruleBox);
  check(`${subject.name}: prizes given up`, prizesGivenUp(subject), prizes);
}

check(
  "a Restored Pokemon is not a Basic",
  isBasicPokemon(card({ name: "Aerodactyl", stage: "RESTORED" })),
  false,
);
check(
  "a Stage 1 is not a Basic",
  isBasicPokemon(card({ name: "Charmeleon", stage: "Stage1" })),
  false,
);

// =============================================================================

section("Card pools");

const standardCard = card({ name: "Iono", regulationMark: "H" });
const rotatedCard = card({ name: "Boss's Orders", regulationMark: "F" });
const baseSetCard = card({
  name: "Professor Oak",
  category: "Trainer",
  setId: "base1",
  regulationMark: undefined,
});
const pocketCard = card({ name: "Pikachu ex", setId: "A1" });

check(
  "an H-mark card is Standard",
  cardPoolReason(standardCard, DECK_FORMATS.standard, POOL),
  null,
);
check(
  "an F-mark card has rotated",
  cardPoolReason(rotatedCard, DECK_FORMATS.standard, POOL),
  "Regulation F has rotated out of Standard",
);
check(
  "a Base Set card is outside Expanded",
  cardPoolReason(baseSetCard, DECK_FORMATS.expanded, POOL),
  "Printed before Black & White — outside Expanded",
);
check(
  "a Base Set card is fine in Unlimited",
  cardPoolReason(baseSetCard, DECK_FORMATS.unlimited, POOL),
  null,
);
check(
  "a rule box card is out of GLC",
  cardPoolReason(
    card({ name: "Charizard ex", suffix: "ex" }),
    DECK_FORMATS.glc,
    POOL,
  ),
  "Rule box cards are not allowed in this format",
);
check(
  "an ACE SPEC is out of GLC",
  cardPoolReason(aceSpec, DECK_FORMATS.glc, POOL),
  "ACE SPEC cards are not allowed in this format",
);
check(
  "a Pocket card cannot be played in the physical game",
  cardPoolReason(pocketCard, DECK_FORMATS.standard, POOL),
  "Pocket cards cannot be played in the physical game",
);
check(
  "a physical card cannot be played in Pocket",
  cardPoolReason(standardCard, DECK_FORMATS.pocket, POOL),
  "Not a Pokemon TCG Pocket card",
);
check(
  "energy cards are not part of a Pocket deck",
  cardPoolReason(
    card({ name: "Basic Fire Energy", category: "Energy", setId: "A1" }),
    DECK_FORMATS.pocket,
    POOL,
  ),
  "Energy cards are not part of a Pocket deck — energy comes from the Energy Zone",
);

// Basic Energy is legal in every format, out of any set ever printed.
const baseSetBasicEnergy = card({
  name: "Fire Energy",
  category: "Energy",
  energyType: "Basic",
  setId: "base1",
  regulationMark: undefined,
});
const baseSetSpecialEnergy = card({
  name: "Double Colorless Energy",
  category: "Energy",
  energyType: "Special",
  setId: "base1",
  regulationMark: undefined,
});

for (const id of ["standard", "expanded", "glc"] as DeckFormatId[]) {
  check(
    `Basic Energy from 1999 is legal in ${id}`,
    cardPoolReason(baseSetBasicEnergy, DECK_FORMATS[id], POOL),
    null,
  );
  check(
    `Basic Energy from 1999 shows as legal in a ${id} search`,
    briefPoolReason(
      { id: "base1-98", name: "Fire Energy" },
      DECK_FORMATS[id],
      POOL,
    ),
    null,
  );
}

check(
  "Special Energy gets no such exemption",
  cardPoolReason(baseSetSpecialEnergy, DECK_FORMATS.expanded, POOL),
  "Printed before Black & White — outside Expanded",
);
check(
  "and a search says the same",
  briefPoolReason(
    { id: "base1-96", name: "Double Colorless Energy" },
    DECK_FORMATS.expanded,
    POOL,
  ),
  "Outside Expanded",
);

// =============================================================================

section("Ban list");

check(
  "Lysandre's Trump Card is banned in Expanded",
  bannedCardReason("Lysandre's Trump Card", "xy4", "expanded"),
  "Banned in Expanded",
);
check(
  "and in Gym Leader Challenge",
  bannedCardReason("Lysandre's Trump Card", "xy4", "glc"),
  "Banned in Gym Leader Challenge",
);
check(
  "but not in Unlimited",
  bannedCardReason("Lysandre's Trump Card", "xy4", "unlimited"),
  null,
);
check(
  "the banned Archeops is the Noble Victories one",
  bannedCardReason("Archeops", "bw3", "expanded"),
  "Banned in Expanded",
);
check(
  "a later Archeops is an ordinary card",
  bannedCardReason("Archeops", "sm10", "expanded"),
  null,
);
check(
  "an ordinary card is not banned",
  bannedCardReason("Iono", "sv3", "expanded"),
  null,
);
check(
  "a search result flags a banned card",
  briefPoolReason(
    { id: "xy4-99", name: "Lysandre's Trump Card" },
    DECK_FORMATS.expanded,
    POOL,
  ),
  "Banned",
);

// =============================================================================

section("Validating a whole deck");

const charmander = card({
  name: "Charmander",
  stage: "Basic",
  types: ["Fire"],
});
const charmeleon = card({
  name: "Charmeleon",
  stage: "Stage1",
  evolveFrom: "Charmander",
  types: ["Fire"],
});
const charizard = card({
  name: "Charizard ex",
  stage: "Stage2",
  suffix: "ex",
  evolveFrom: "Charmeleon",
  types: ["Darkness"],
  attacks: [{ name: "Burning Darkness", cost: ["Fire", "Fire"] }],
});

function issuesFor(entries: [DeckCard, number][], formatId: DeckFormatId) {
  const built = deck(entries, formatId);
  const format = deckFormat(formatId);
  return validateDeck(built, format, analyzeDeck(built, format), POOL).map(
    (issue) => `${issue.level}:${issue.id}`,
  );
}

const legalSixty = issuesFor(
  [
    [charmander, 4],
    [charmeleon, 3],
    [charizard, 3],
    [iono, 4],
    [fireEnergy, 46],
  ],
  "standard",
);
check(
  "sixty cards with a Basic and its energy is legal",
  legalSixty.filter((issue) => issue.startsWith("error:")),
  [],
);

check(
  "fifty-nine cards is not a deck",
  issuesFor([[charmander, 59]], "standard").includes("error:deck-size"),
  true,
);
check(
  "a deck with no Basic cannot start",
  issuesFor(
    [
      [charmeleon, 4],
      [iono, 4],
      [fireEnergy, 52],
    ],
    "standard",
  ).includes("error:no-basic"),
  true,
);
check(
  "five of a name is over the limit",
  issuesFor(
    [
      [charmander, 5],
      [iono, 4],
      [fireEnergy, 51],
    ],
    "standard",
  ).some((issue) => issue.startsWith("error:copies-")),
  true,
);
check(
  "two of a card breaks GLC",
  issuesFor(
    [
      [charmander, 2],
      [fireEnergy, 58],
    ],
    "glc",
  ).some((issue) => issue.startsWith("error:copies-")),
  true,
);
check(
  "two energy types among the Pokemon breaks GLC",
  issuesFor(
    [
      [charmander, 1],
      [{ ...charizard, name: "Zoroark" }, 1],
      [fireEnergy, 58],
    ],
    "glc",
  ).includes("error:single-type"),
  true,
);
check(
  "a top-heavy line is flagged",
  issuesFor(
    [
      [charmander, 2],
      [charmeleon, 3],
      [charizard, 3],
      [iono, 4],
      [fireEnergy, 48],
    ],
    "standard",
  ).some((issue) => issue === "warning:line-Charmander"),
  true,
);
check(
  "a broken line is named after the card that is actually in the deck",
  analyzeDeck(
    deck(
      [
        [charmander, 4],
        [charizard, 3],
      ],
      "standard",
    ),
    DECK_FORMATS.standard,
  ).lines.map((line) => line.base),
  ["Charizard ex", "Charmander"],
);
check(
  "and the missing step is reported as a gap",
  issuesFor(
    [
      [charmander, 4],
      [charizard, 3],
      [iono, 4],
      [fireEnergy, 49],
    ],
    "standard",
  ).includes("warning:gap-Charizard ex"),
  true,
);
check(
  "an attack with no energy behind it is flagged",
  issuesFor(
    [
      [charmander, 4],
      [charizard, 4],
      [iono, 4],
      [{ ...fireEnergy, name: "Basic Water Energy" }, 48],
    ],
    "standard",
  ).some((issue) => issue === "warning:energy-Fire"),
  true,
);

check(
  "Pocket is not told to play Rare Candy, which it does not have",
  issuesFor(
    [
      [{ ...charmander, setId: "A1", id: "A1-1" }, 2],
      [{ ...charizard, setId: "A1", id: "A1-2" }, 2],
    ],
    "pocket",
  ).includes("note:rare-candy"),
  false,
);
check(
  "the physical game is",
  issuesFor(
    [
      [charmander, 4],
      [charmeleon, 3],
      [charizard, 3],
      [iono, 4],
      [fireEnergy, 46],
    ],
    "standard",
  ).includes("note:rare-candy"),
  true,
);

const pocketBasic = card({ name: "Pikachu", setId: "A1", stage: "Basic" });
const pocketItem = card({
  name: "Poke Ball",
  setId: "A1",
  category: "Trainer",
  trainerType: "Item",
});
check(
  "twenty Pocket cards with a Basic is legal",
  issuesFor(
    [
      [pocketBasic, 2],
      [{ ...pocketBasic, name: "Bulbasaur" }, 2],
      [{ ...pocketBasic, name: "Charmander" }, 2],
      [{ ...pocketBasic, name: "Squirtle" }, 2],
      [{ ...pocketBasic, name: "Eevee" }, 2],
      [pocketItem, 2],
      [{ ...pocketItem, name: "Professor's Research" }, 2],
      [{ ...pocketItem, name: "Sabrina" }, 2],
      [{ ...pocketItem, name: "Giovanni" }, 2],
      [{ ...pocketItem, name: "X Speed" }, 2],
    ],
    "pocket",
  ).filter((issue) => issue.startsWith("error:")),
  [],
);
check(
  "sixty cards is too many for Pocket",
  issuesFor([[pocketBasic, 60]], "pocket").includes("error:deck-size"),
  true,
);

// =============================================================================

section("Odds");

const sixtyWithTwelveBasics = deck(
  [
    [charmander, 12],
    [iono, 4],
    [fireEnergy, 44],
  ],
  "standard",
);
const analysis = analyzeDeck(sixtyWithTwelveBasics, DECK_FORMATS.standard);
check(
  "twelve Basics mulligans about 19% of the time",
  analysis.mulliganOdds === null
    ? null
    : Math.round(analysis.mulliganOdds * 1000) / 10,
  19.1,
);
check(
  "a four-of shows up in the opening hand 40% of the time",
  Math.round(chanceOfAtLeastOne(60, 4, 7) * 1000) / 10,
  39.9,
);
check(
  "a one-of is prized 10% of the time",
  Math.round(chanceOfAtLeastOne(60, 1, 6) * 1000) / 10,
  10,
);

const pocketDeck = deck([[pocketBasic, 20]], "pocket");
check(
  "a Pocket deck never mulligans",
  analyzeDeck(pocketDeck, DECK_FORMATS.pocket).mulliganOdds,
  null,
);

// =============================================================================

console.log(
  `\n${checks - failures}/${checks} checks passed${failures > 0 ? ` — ${failures} FAILED` : ""}`,
);
process.exit(failures > 0 ? 1 : 0);
