# NationalDex

A fast, beautiful, and feature-rich Pokedex built for trainers who want instant access to everything Pokemon.

## What is this?

NationalDex is a modern web-based Pokedex covering the full National Dex across all generations. It goes beyond a simple lookup tool — you can search for any Pokemon, move, ability, item, or trading card instantly, build and manage teams with type coverage analysis, compare Pokemon side by side, track favorites, and create custom lists. It works offline as a PWA and supports dark mode.

### Key features

- **Instant search** across Pokemon, moves, abilities, items, and cards
- **Trading cards** from both the Pokemon TCG and Pokemon TCG Pocket — browse and filter every card by set, energy type, rarity, stage and HP, open a card's own page, and cross-reference between a card and the Pokemon it depicts
- **Game-relative view** — read the entire dex as any generation's games: learnsets, base stats, types, abilities, items, moves, evolutions, type charts, and search all scoped to the games you're playing
- **Team builder** with type coverage analysis and Showdown import/export
- **Pokemon comparison** with side-by-side stat breakdowns
- **Favorites and custom lists** persisted in local storage — Pokemon and cards alike
- **Location finder** for Pokemon across all regions and games
- **PWA support** — installable on any device for a native-like experience
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
