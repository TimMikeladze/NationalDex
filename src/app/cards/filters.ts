import type { TcgSortField, TcgSortOrder } from "@/lib/tcg";
import type { TcgGame } from "@/types/tcg";
import { TCG_GAME_FULL_LABELS } from "@/types/tcg";

export type GameFilter = "all" | TcgGame;

/** The card browser's filter state, as it is held in the URL. */
export interface CardFilterState {
  q: string;
  game: string;
  set: string;
  types: string[];
  rarities: string[];
  category: string;
  stage: string;
  suffix: string;
  regulationMark: string;
  trainerType: string;
  energyType: string;
  /** Printings the card must exist in, e.g. `holo`, `reverse`. */
  variants: string[];
  illustrator: string;
  hpMin: number | null;
  hpMax: number | null;
  dexId: number | null;
  sort: string;
  /** Which language's catalogue is being browsed. */
  lang: string;
}

/** Null clears a filter, which is also how it leaves the URL. */
export type CardFilterUpdate = Partial<{
  [K in keyof CardFilterState]: CardFilterState[K] | null;
}>;

/** Short labels — the full names wrap to three lines on a phone. */
export const GAME_OPTIONS: {
  id: GameFilter;
  label: string;
  title: string;
}[] = [
  { id: "all", label: "All", title: "Both card games" },
  { id: "tcg", label: "TCG", title: TCG_GAME_FULL_LABELS.tcg },
  { id: "pocket", label: "Pocket", title: TCG_GAME_FULL_LABELS.pocket },
];

export const HP_PRESETS = [
  { label: "Any", min: null, max: null },
  { label: "≤ 60", min: null, max: 60 },
  { label: "70-120", min: 70, max: 120 },
  { label: "130-200", min: 130, max: 200 },
  { label: "210+", min: 210, max: null },
];

export const SORT_OPTIONS: {
  value: string;
  label: string;
  field: TcgSortField | null;
  order: TcgSortOrder;
}[] = [
  { value: "default", label: "Set order", field: null, order: "ASC" },
  { value: "name-asc", label: "Name A-Z", field: "name", order: "ASC" },
  { value: "name-desc", label: "Name Z-A", field: "name", order: "DESC" },
  { value: "hp-desc", label: "HP high to low", field: "hp", order: "DESC" },
  { value: "hp-asc", label: "HP low to high", field: "hp", order: "ASC" },
  { value: "id-asc", label: "Card ID", field: "id", order: "ASC" },
  {
    value: "rarity-desc",
    label: "Rarest first",
    field: "rarity",
    order: "DESC",
  },
  {
    value: "rarity-asc",
    label: "Commonest first",
    field: "rarity",
    order: "ASC",
  },
];

export function isGameFilter(value: string): value is GameFilter {
  return value === "all" || value === "tcg" || value === "pocket";
}
