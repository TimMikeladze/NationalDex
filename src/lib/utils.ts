import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const SITE_URL = "https://www.nationaldex.app";

/**
 * Next data-cache window for upstream assets that all but never change —
 * PokeAPI records, sprite files, font files.
 */
export const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Fisher-Yates, but deterministic: the same seed always deals the same order.
 * A random browse lives in the URL as its seed, so sharing or reloading one
 * shows the same shuffle rather than a fresh one.
 */
export function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let currentSeed = seed;

  // mulberry32
  const random = () => {
    currentSeed |= 0;
    currentSeed = (currentSeed + 0x6d2b79f5) | 0;
    let t = Math.imul(currentSeed ^ (currentSeed >>> 15), 1 | currentSeed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
