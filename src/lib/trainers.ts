import { TRAINERS } from "@/data/trainers";
import type { Trainer, TrainerRegion, TrainerRole } from "@/types/trainer";

export const TRAINER_ROLE_LABELS: Record<TrainerRole, string> = {
  "gym-leader": "Gym Leader",
  "trial-captain": "Trial Captain",
  "island-kahuna": "Island Kahuna",
  "elite-four": "Elite Four",
  champion: "Champion",
};

/** The order the roles come up in a playthrough. */
export const TRAINER_ROLES: TrainerRole[] = [
  "gym-leader",
  "trial-captain",
  "island-kahuna",
  "elite-four",
  "champion",
];

export const TRAINER_REGION_LABELS: Record<TrainerRegion, string> = {
  kanto: "Kanto",
  johto: "Johto",
  hoenn: "Hoenn",
  sinnoh: "Sinnoh",
  unova: "Unova",
  kalos: "Kalos",
  alola: "Alola",
  galar: "Galar",
  paldea: "Paldea",
};

export function getAllTrainers(): Trainer[] {
  return TRAINERS;
}

export function getTrainer(slug: string): Trainer | undefined {
  return TRAINERS.find((t) => t.slug === slug);
}

/** Generations that have at least one trainer, ascending. */
export function getTrainerGenerations(): number[] {
  return [...new Set(TRAINERS.map((t) => t.generation))].sort((a, b) => a - b);
}

/** Every other appearance of the same person, e.g. Koga's Elite Four entry. */
export function getOtherAppearances(trainer: Trainer): Trainer[] {
  return TRAINERS.filter(
    (t) => t.name === trainer.name && t.slug !== trainer.slug,
  );
}

export function formatTrainerRole(role: TrainerRole): string {
  return TRAINER_ROLE_LABELS[role];
}
