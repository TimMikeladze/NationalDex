export type Generation =
  | "national-dex"
  | "generation-i"
  | "generation-ii"
  | "generation-iii"
  | "generation-iv"
  | "generation-v"
  | "generation-vi"
  | "generation-vii"
  | "generation-viii"
  | "generation-ix";

export interface TeamMember {
  id: number;
  name: string;
  sprite: string;
}

export interface Team {
  id: string;
  name: string;
  generation: Generation;
  members: TeamMember[]; // Max 6 Pokemon
  createdAt: number;
  updatedAt: number;
}

export const GENERATION_INFO: Record<
  Generation,
  { name: string; label: string; pokemonRange: [number, number] }
> = {
  "national-dex": {
    name: "National Dex",
    label: "All Generations",
    pokemonRange: [1, 1025],
  },
  "generation-i": { name: "Gen I", label: "Red/Blue", pokemonRange: [1, 151] },
  "generation-ii": {
    name: "Gen II",
    label: "Gold/Silver",
    pokemonRange: [152, 251],
  },
  "generation-iii": {
    name: "Gen III",
    label: "Ruby/Sapphire",
    pokemonRange: [252, 386],
  },
  "generation-iv": {
    name: "Gen IV",
    label: "Diamond/Pearl",
    pokemonRange: [387, 493],
  },
  "generation-v": {
    name: "Gen V",
    label: "Black/White",
    pokemonRange: [494, 649],
  },
  "generation-vi": { name: "Gen VI", label: "X/Y", pokemonRange: [650, 721] },
  "generation-vii": {
    name: "Gen VII",
    label: "Sun/Moon",
    pokemonRange: [722, 809],
  },
  "generation-viii": {
    name: "Gen VIII",
    label: "Sword/Shield",
    pokemonRange: [810, 905],
  },
  "generation-ix": {
    name: "Gen IX",
    label: "Scarlet/Violet",
    pokemonRange: [906, 1025],
  },
};

export const GENERATIONS_LIST: Generation[] = [
  "national-dex",
  "generation-i",
  "generation-ii",
  "generation-iii",
  "generation-iv",
  "generation-v",
  "generation-vi",
  "generation-vii",
  "generation-viii",
  "generation-ix",
];
