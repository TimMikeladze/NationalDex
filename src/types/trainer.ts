import type { PokemonType } from "./pokemon";

/**
 * The job a notable trainer holds in their game's story. The gym ladder is
 * the default; Alola swaps it for trials and kahunas, and the League caps
 * every region.
 */
export type TrainerRole =
  | "gym-leader"
  | "trial-captain"
  | "island-kahuna"
  | "elite-four"
  | "champion";

export type TrainerRegion =
  | "kanto"
  | "johto"
  | "hoenn"
  | "sinnoh"
  | "unova"
  | "kalos"
  | "alola"
  | "galar"
  | "paldea";

export interface Trainer {
  /** URL slug. Unique across the whole dataset, so a trainer who holds two
   * jobs (Koga the gym leader, Koga of the Elite Four) gets two entries. */
  slug: string;
  name: string;
  role: TrainerRole;
  region: TrainerRegion;
  /** The generation whose games this appearance belongs to. */
  generation: number;
  /** The type the trainer specialises in; champions usually have none. */
  type: PokemonType | null;
  /** Badge awarded (gym leaders only). */
  badge?: string;
  /** Where in the region the battle takes place. */
  location: string;
  /** The games this appearance is drawn from, e.g. "Red/Blue/Yellow". */
  games: string;
  /** The trainer's signature Pokémon, as a Showdown species name. */
  ace?: string;
}
