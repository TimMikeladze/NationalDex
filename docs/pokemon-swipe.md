# Pokémon swipe deck

`/pokemon/swipe` deals the dex one Pokémon at a time, with the same deck the
card catalogue uses at `/cards/swipe`: swipe right to favourite, left to pass,
up to file in a list, tap to look closer; every gesture is also a button and a
key, and undo works the same.

## Approach

- **One deck, two faces.** The deck and its card move out of `components/tcg`
  into `components/swipe` and become generic over the item:
  - `SwipeDeck<T>` (`swipe-deck.tsx`) owns layout, stack, history, undo,
    keys, controls and the list dialog. Callers pass `items`, `getKey`,
    `getName`, favourite accessors, `renderFace`, `renderPeek` and the
    add-to-list payload.
  - `SwipeCard` (`swipe-card.tsx`) owns the gesture, depth, flight, washes,
    gloss and stamps; the face is a render prop.
  - `TcgSwipeDeck` stays as a thin adapter, so `/cards/swipe` is unchanged.
- **Pokémon face** (`components/pokemon/pokemon-swipe-face.tsx`): a
  card-shaped panel tinted by the Pokémon's types — number, name, types,
  region/variant, the sprite (user's sprite preference, same fallbacks as the
  grid) and all six base stats as bars with the total.
- **Look closer**: a dialog showing the same face larger inside `HoloCard`
  (tilt + foil) with a link to the full Pokémon page.
- **Filters**: the deck reads the dex's own filter (`useDexFilter`, same URL
  keys + persisted state), so search, types, gens, regulations, traits, stat
  ranges, sort and shuffle carry over from the grid. The swipe page adds a
  generation chip row for quick narrowing without leaving the deck.
- **Way in**: a "Swipe" link in the dex toolbar, carrying the query string.
- Favourites use `useFavorites` (dex number), lists use item type `pokemon`.
