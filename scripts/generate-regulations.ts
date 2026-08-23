/**
 * Generates src/data/regulations.json — which Pokemon are legal in each
 * current competitive regulation (VGC / Battle Stadium Singles).
 *
 * Regulation legality lives in @pkmn/sim's format rulesets, which is a ~46MB
 * dependency we don't want in the client bundle, so it stays a devDependency
 * and this script bakes the answer into a small lookup table.
 *
 * Re-run after bumping @pkmn/sim, since Showdown retires old regulations and
 * adds new ones: bun run generate:regulations
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Dex } from "@pkmn/sim";

const OUTPUT_PATH = join(
  import.meta.dir,
  "..",
  "src",
  "data",
  "regulations.json",
);

/** Showdown ids for the regulation-style formats we surface. */
const REGULATION_ID_PATTERN = /^gen\d+(vgc\d{4}reg|bssreg)/;

interface Regulation {
  id: string;
  name: string;
}

interface RegulationData {
  generatedWith: string;
  regulations: Regulation[];
  /** slug -> bitmask of regulation indices the Pokemon is legal in */
  legal: Record<string, number>;
  /** slug -> bitmask of regulation indices where it counts as restricted */
  restricted: Record<string, number>;
}

function main() {
  const formats = Dex.formats
    .all()
    .filter((f) => REGULATION_ID_PATTERN.test(f.id))
    // Newest first: "VGC 2025 Reg I" sorts above "VGC 2024 Reg G" above "BSS Reg I".
    .sort((a, b) => b.name.localeCompare(a.name));

  if (formats.length === 0) {
    throw new Error("No regulation formats found in @pkmn/sim");
  }

  const regulations: Regulation[] = formats.map((f) => ({
    id: f.id,
    name: f.name.replace(/^\[Gen \d+\]\s*/, ""),
  }));

  const legal: Record<string, number> = {};
  const restricted: Record<string, number> = {};

  formats.forEach((format, index) => {
    const bit = 1 << index;
    const ruleTable = Dex.formats.getRuleTable(format);
    const dex = Dex.forFormat(format);

    for (const species of dex.species.all()) {
      if (species.num <= 0) continue;
      // isNonstandard covers Past/Future/CAP/LGPE forms — anything not
      // obtainable in the format's own games.
      if (species.isNonstandard) continue;
      if (ruleTable.isBannedSpecies(species)) continue;

      legal[species.id] = (legal[species.id] ?? 0) | bit;
      if (ruleTable.isRestrictedSpecies(species)) {
        restricted[species.id] = (restricted[species.id] ?? 0) | bit;
      }
    }

    console.log(
      `${format.name}: ${
        Object.values(legal).filter((mask) => mask & bit).length
      } legal, ${
        Object.values(restricted).filter((mask) => mask & bit).length
      } restricted`,
    );
  });

  const version =
    // biome-ignore lint/suspicious/noExplicitAny: reading package metadata at build time
    (require("@pkmn/sim/package.json") as any).version ?? "unknown";

  const data: RegulationData = {
    generatedWith: `@pkmn/sim@${version}`,
    regulations,
    legal: sortKeys(legal),
    restricted: sortKeys(restricted),
  };

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(data, null, 0)}\n`);
  console.log(
    `Wrote ${OUTPUT_PATH} (${regulations.length} regulations, ${
      Object.keys(legal).length
    } Pokemon)`,
  );
}

function sortKeys(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b)),
  );
}

main();
