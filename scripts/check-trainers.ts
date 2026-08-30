/**
 * Checks the hand-kept trainer dataset for the mistakes a typo introduces.
 *
 * Every slug must be unique (each one is a URL), every ace must resolve to a
 * species the dex knows, every type must be a real type, every gym leader
 * must award a badge, and every generation must be one the app covers.
 *
 * bun run check:trainers
 */

import { TRAINERS } from "../src/data/trainers";
import { ALL_TYPES, GENERATIONS, resolveSpecies } from "../src/lib/pkmn";
import {
  getOtherAppearances,
  getTrainer,
  getTrainerGenerations,
} from "../src/lib/trainers";

let failures = 0;
let checks = 0;

function check(what: string, ok: boolean, detail?: string) {
  checks++;
  if (!ok) {
    failures++;
    console.error(`  ✗ ${what}${detail ? `\n      ${detail}` : ""}`);
  }
}

console.log("Trainer dataset");

const slugs = new Set<string>();
const validGens = new Set<number>(GENERATIONS.map((g) => g.num));
const validTypes = new Set<string>(ALL_TYPES);

for (const trainer of TRAINERS) {
  const label = `${trainer.name} (${trainer.slug})`;

  check(`${label}: slug is unique`, !slugs.has(trainer.slug));
  slugs.add(trainer.slug);

  check(
    `${label}: slug is url-safe`,
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(trainer.slug),
    trainer.slug,
  );

  check(
    `${label}: generation is known`,
    validGens.has(trainer.generation),
    String(trainer.generation),
  );

  check(
    `${label}: type is a real type`,
    trainer.type === null || validTypes.has(trainer.type),
    String(trainer.type),
  );

  check(
    `${label}: gym leaders award a badge`,
    trainer.role !== "gym-leader" || Boolean(trainer.badge),
  );

  check(
    `${label}: only gym leaders award badges`,
    trainer.role === "gym-leader" || !trainer.badge,
  );

  if (trainer.ace) {
    const species = resolveSpecies(trainer.ace);
    check(
      `${label}: ace resolves to a species`,
      Boolean(species),
      trainer.ace,
    );
    if (species) {
      check(
        `${label}: ace exists by ${label}'s generation`,
        species.gen <= trainer.generation,
        `${species.name} is gen ${species.gen}`,
      );
    }
  }
}

console.log("\nLookups");
check("getTrainer finds Brock", getTrainer("brock")?.name === "Brock");
check("getTrainer misses unknown slugs", getTrainer("nobody") === undefined);
const koga = getTrainer("koga");
check(
  "Koga links his Elite Four appearance",
  koga !== undefined &&
    getOtherAppearances(koga).some((t) => t.slug === "koga-elite-four"),
);
check(
  "every generation 1–9 has trainers",
  getTrainerGenerations().join(",") === "1,2,3,4,5,6,7,8,9",
  getTrainerGenerations().join(","),
);

console.log(`\n${checks} checks, ${failures} failed`);
if (failures > 0) process.exit(1);
