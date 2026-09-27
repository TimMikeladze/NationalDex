/**
 * The app's primary destinations — the phone's tab bar, in order.
 *
 * Plain data, no icons, so the server-side manifest can read it too: the tab
 * bar and the home-screen shortcuts are the same list, and cannot drift.
 */
export const PRIMARY_NAV = [
  { id: "dex", href: "/", label: "dex", name: "Dex" },
  { id: "cards", href: "/cards", label: "cards", name: "Cards" },
  { id: "decks", href: "/decks", label: "decks", name: "Deck Builder" },
  { id: "teams", href: "/teams", label: "teams", name: "Teams" },
  { id: "favorites", href: "/favorites", label: "favs", name: "Favorites" },
] as const;

export type PrimaryNavId = (typeof PRIMARY_NAV)[number]["id"];
export type PrimaryNavItem = (typeof PRIMARY_NAV)[number];

/** Looks a destination up by id, and refuses to invent one. */
export function primaryNavItem(id: string): PrimaryNavItem {
  const item = PRIMARY_NAV.find((entry) => entry.id === id);
  if (!item) throw new Error(`"${id}" is not in PRIMARY_NAV`);
  return item;
}

/** `/` prefixes everything, so the dex is only current on the dex itself. */
export function isNavActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// The home-screen long-press menu. The dex is left out because it is where the
// app opens anyway. Resolved at module load, so a renamed or removed tab fails
// the build instead of shipping a shortcut to nowhere.
export const MANIFEST_SHORTCUTS = (
  ["cards", "decks", "teams", "favorites"] as const
).map(primaryNavItem);
