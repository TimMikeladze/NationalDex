# NationalDex

A fast, beautiful, and feature-rich Pokedex built for trainers who want instant access to everything Pokemon.

## What is this?

NationalDex is a modern web-based Pokedex covering the full National Dex across all generations. It goes beyond a simple lookup tool — you can search for any Pokemon, move, ability, item, or trading card instantly, build and manage teams with type coverage analysis, compare Pokemon side by side, track favorites, and create custom lists. It works offline as a PWA and supports dark mode.

The NationalDex logo is the compact Pokédex mark used throughout the desktop app bar, mobile launch screen, browser favicon, and installable PWA. The canonical source artwork lives at [`public/icons/logo-app.svg`](public/icons/logo-app.svg); every brand surface references that same device mark so it stays consistent across platforms.

After editing that SVG, run `bun run generate:icons` to re-render the derived assets — the favicon, the PWA icons, and the Apple touch icon — from it:

```bash
bun run generate:icons
```

### Key features

- **Instant search** built into the pages themselves — the dex searches Pokemon, moves, abilities and items from its own tabs, and the card browser searches the TCG catalogue
- **Trading cards** from both the Pokemon TCG and Pokemon TCG Pocket — browsing opens on the newest sets with the whole catalogue one tap away, filter every card by set, energy type, rarity, stage and HP, hold any card up full size and walk the results with the arrow keys, open a card's own page, and cross-reference between a card and the Pokemon it depicts
- **Swipe through cards** — the same search dealt one card at a time: right to favorite, left to pass, up to file it in a list
- **Deck builder** — a dedicated builder for every deck: pick a rule set (Standard, Expanded, Unlimited, Gym Leader Challenge or TCG Pocket) and the card pool narrows to what that format can legally play, drag cards from the pool into the deck, and read the deck back as a binder that groups itself by card type, energy type or evolution line. Every list is checked as you build — deck size, four of a name, one ACE SPEC, evolution lines that hold up — alongside the numbers that decide a deck: mulligan odds, opening-hand and prize odds per count, Supporter and energy counts, the prize trade and the energy each attack needs. Decks export as a written list or a share code
- **Game-relative view** — read the entire dex as any generation's games: learnsets, base stats, types, abilities, items, moves, evolutions, type charts, and search all scoped to the games you're playing
- **Team builder** with type coverage analysis and Showdown import/export
- **Pokemon comparison** with side-by-side stat breakdowns
- **Favorites and custom lists** persisted in local storage — Pokemon and cards alike
- **Location finder** for Pokemon across all regions and games
- **PWA support** — installable on any device for a native-like experience, with the NationalDex mark supplied as the app icon and launch-screen branding. A service worker ([`public/sw.js`](public/sw.js)) keeps visited pages, build assets, and sprites available offline, falls back to `/offline` for anything unseen, and offers a reload toast when a new version is deployed. It is only registered in production builds so it never interferes with `next dev`.
- **Dark mode** with automatic theme detection

## Running locally

```bash
# Clone the repo
git clone https://github.com/TimMikeladze/nationaldex.git
cd nationaldex

# Install dependencies
bun install

# Start the dev server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

No database or environment variables are required. All Pokemon data is bundled at build time or fetched from public APIs. User data (favorites, teams, lists) is stored in the browser's local storage.

### Available scripts

| Command | Description |
|---|---|
| `bun dev` | Start the development server |
| `bun build` | Build for production |
| `bun start` | Start the production server |
| `bun lint` | Run linting and format checks |
| `bun lint:fix` | Auto-fix linting issues |
| `bun check:deck-rules` | Check the deck formats against the rules they enforce |

## Contributing

1. Fork the repo and create your branch from `main`
2. Run `bun install` to set up dependencies
3. Make your changes and verify they pass `bun lint` and `bun build`
4. Open a pull request

## Data attribution

- [PokeAPI](https://pokeapi.co) — Pokemon data and game information
- [pkmn/ps](https://github.com/pkmn/ps) — Sprites and competitive data
- [TCGdex](https://tcgdex.dev) — Trading card data and artwork for the Pokemon TCG and TCG Pocket

Pokemon is a trademark of Nintendo / Creatures Inc. / GAME FREAK Inc. This project is not affiliated with or endorsed by any of these companies.
