import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const SITE_URL = "https://www.nationaldex.app";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
