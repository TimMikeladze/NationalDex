/**
 * Getting a deck out of the browser and back in again.
 *
 * A deck lives in local storage, which means it lives on one device until it is
 * written down somewhere. Two ways out: the deck list players already read and
 * paste to each other, and a code that carries the whole thing losslessly.
 */

import { isEnergy, isPokemon, isTrainer } from "@/lib/deck";
import type { Deck, DeckEntry } from "@/types/deck";
import { deckFormat } from "@/types/deck";
import { formatLocalId } from "@/types/tcg";

/**
 * The deck as a player writes it down: the three piles with their totals, each
 * card as a count, a name and where the printing came from. It mirrors the list
 * a tournament deck sheet asks for, so it can be read by anyone who plays.
 */
export function deckToText(deck: Deck): string {
  const format = deckFormat(deck.formatId);
  const lines: string[] = [];

  const section = (title: string, entries: DeckEntry[]) => {
    const total = entries.reduce((sum, entry) => sum + entry.count, 0);
    if (total === 0) return;
    lines.push(`${title}: ${total}`);
    for (const entry of [...entries].sort((a, b) =>
      a.card.name.localeCompare(b.card.name),
    )) {
      lines.push(
        `${entry.count} ${entry.card.name} ${entry.card.setId.toUpperCase()} ${formatLocalId(entry.card.localId)}`,
      );
    }
    lines.push("");
  };

  lines.push(`# ${deck.name} — ${format.name}`);
  lines.push("");

  section(
    "Pokémon",
    deck.entries.filter((entry) => isPokemon(entry.card)),
  );
  section(
    "Trainer",
    deck.entries.filter((entry) => isTrainer(entry.card)),
  );
  section(
    "Energy",
    deck.entries.filter((entry) => isEnergy(entry.card)),
  );

  const other = deck.entries.filter(
    (entry) =>
      !isPokemon(entry.card) && !isTrainer(entry.card) && !isEnergy(entry.card),
  );
  section("Other", other);

  lines.push(
    `Total Cards: ${deck.entries.reduce((sum, entry) => sum + entry.count, 0)}`,
  );

  return lines.join("\n");
}

/** The compact shape a shared deck travels as. */
interface SharedDeck {
  v: 1;
  n: string;
  f: string;
  l: string;
  /** Card id and how many copies. */
  c: [string, number][];
}

function toBase64Url(value: string): string {
  const base64 =
    typeof btoa === "function"
      ? btoa(unescape(encodeURIComponent(value)))
      : Buffer.from(value, "utf8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return typeof atob === "function"
    ? decodeURIComponent(escape(atob(padded)))
    : Buffer.from(padded, "base64").toString("utf8");
}

/**
 * The whole deck as one string. Only the card ids travel — the details are
 * fetched again on the way in, so a code stays short enough to paste into a
 * message and can never carry a stale copy of a card.
 */
export function deckToCode(deck: Deck): string {
  const shared: SharedDeck = {
    v: 1,
    n: deck.name,
    f: deck.formatId,
    l: deck.language,
    c: deck.entries.map((entry) => [entry.card.id, entry.count]),
  };
  return toBase64Url(JSON.stringify(shared));
}

export interface ParsedDeck {
  name?: string;
  formatId?: string;
  language?: string;
  cards: { id: string; count: number }[];
}

/** Reads a share code back, or nothing if it is not one. */
export function parseDeckCode(value: string): ParsedDeck | null {
  try {
    const parsed = JSON.parse(fromBase64Url(value.trim())) as SharedDeck;
    if (!parsed || !Array.isArray(parsed.c)) return null;
    return {
      name: parsed.n,
      formatId: parsed.f,
      language: parsed.l,
      cards: parsed.c
        .filter(
          (entry) =>
            Array.isArray(entry) &&
            typeof entry[0] === "string" &&
            typeof entry[1] === "number",
        )
        .map(([id, count]) => ({ id, count })),
    };
  } catch {
    return null;
  }
}

/**
 * Reads a written list back. Only the lines that end in a card id can be
 * matched — a name alone does not say which printing it means — so an exported
 * list round-trips and a hand-written one is met halfway.
 */
export function parseDeckLines(value: string): ParsedDeck {
  const cards: { id: string; count: number }[] = [];

  for (const raw of value.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^(pok[eé]mon|trainer|energy|other|total)\b.*:/i.test(line)) continue;

    // "4 Charmander MEW 4", "4 mew-4", "4x mew-4"
    const match = line.match(/^(\d+)\s*x?\s+(.*)$/i);
    if (!match) continue;
    const count = Number.parseInt(match[1], 10);
    const rest = match[2].trim();

    const idMatch =
      rest.match(/([A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*-[A-Za-z0-9%]+)\s*$/) ??
      // The written form puts the set and the number in the last two words.
      rest.match(/\s([A-Za-z0-9.]+)\s+([A-Za-z0-9%]+)\s*$/);

    if (!idMatch) continue;
    const id = idMatch.length > 2 ? `${idMatch[1]}-${idMatch[2]}` : idMatch[1];
    if (Number.isFinite(count) && count > 0) {
      cards.push({ id: id.toLowerCase(), count });
    }
  }

  return { cards };
}

/** Either shape, whichever the pasted text turns out to be. */
export function parseDeckInput(value: string): ParsedDeck | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const code = parseDeckCode(trimmed);
  if (code && code.cards.length > 0) return code;
  const lines = parseDeckLines(trimmed);
  return lines.cards.length > 0 ? lines : null;
}
