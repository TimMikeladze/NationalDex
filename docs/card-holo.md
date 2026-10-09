# Holo cards: depth, light and tilt on every TCG card

Every trading card the app draws large enough to hold — grid tiles, the deck
builder's search and binder, the card page and the lightbox — sits in one
wrapper, `TcgCardHolo` (`src/components/tcg/tcg-card-holo.tsx`). The swipe deck
keeps its own physics and is left alone; tiny thumbnails (deck spines, list
rows) stay flat.

## What it does

- **Depth at rest.** Rounded to a real card's 3mm corners, with a soft two-part
  shadow: a tight contact shadow and a wider ambient one. No overlay on the
  artwork while idle.
- **Tilt.** The point under the pointer or finger leans toward you (max ~11°,
  6° on small tiles), with perspective, a slight lift and a deeper shadow that
  slides away from the raised edge.
- **Light.** Two layers clipped to the card and only visible while it is held:
  a glare that follows the pointer (`overlay`) and a faint rainbow foil with a
  fine diagonal grain (`color-dodge`) whose bands slide as the card turns. One
  generic recipe for every card — no per-rarity variants.
- **Motion.** A rAF spring writes CSS custom properties on the element
  (`--holo-tx/ty`, `--holo-px/py`, `--holo-a`); React never re-renders while
  tilting, and the loop stops once the card settles.

## Input

- Mouse/pen: tilts on hover.
- Touch, `touch="pan"` (default): a finger tilts the card, `touch-action: pan-y`
  so a vertical swipe still scrolls the grid (the browser cancels the tilt).
- Touch, `touch="grab"`: `touch-action: none`, the finger owns the card
  (lightbox).
- Touch, `touch="off"`: places with their own touch drag (deck binder).
- A press that turned into a tilt-drag swallows the click, so tilting a tile
  with a finger does not open it.
- `prefers-reduced-motion`: no rotation or lift; glare still follows.

## Pieces

- `src/lib/card-tilt.ts` — pure pointer → tilt math (tested).
- `src/components/tcg/tcg-card-holo.tsx` — wrapper + spring.
- `.holo-*` rules in `src/app/globals.css`.
