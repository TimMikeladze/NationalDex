# nationaldex

A fast, beautiful, and feature-rich Pokedex built for trainers who want instant access to everything Pokemon.

## What is this?

nationaldex is a modern web-based Pokedex covering the full National Dex across all generations. It goes beyond a simple lookup tool — you can search for any Pokemon, move, ability, or item instantly, build and manage teams with type coverage analysis, compare Pokemon side by side, track favorites, and create custom lists. It works offline as a PWA and supports dark mode.

### Key features

- **Instant search** across Pokemon, moves, abilities, and items
- **Team builder** with type coverage analysis and Showdown import/export
- **Pokemon comparison** with side-by-side stat breakdowns
- **Favorites and custom lists** persisted in local storage
- **Location finder** for Pokemon across all regions and games
- **PWA support** — installable on any device for a native-like experience
- **Dark mode** with automatic theme detection

## Running locally

### Prerequisites

- [Node.js](https://nodejs.org) (v18+)
- [Yarn](https://yarnpkg.com), npm, or [Bun](https://bun.sh)

### Setup

```bash
# Clone the repo
git clone https://github.com/TimMikeladze/nationaldex.git
cd nationaldex

# Install dependencies
yarn install

# Start the dev server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

No database or environment variables are required. All Pokemon data is bundled at build time or fetched from public APIs. User data (favorites, teams, lists) is stored in the browser's local storage.

### Available scripts

| Command | Description |
|---|---|
| `yarn dev` | Start the development server |
| `yarn build` | Build for production |
| `yarn start` | Start the production server |
| `yarn lint` | Run linting and format checks |
| `yarn lint:fix` | Auto-fix linting issues |

## Contributing

1. Fork the repo and create your branch from `main`
2. Run `yarn install` to set up dependencies
3. Make your changes and verify they pass `yarn lint` and `yarn build`
4. Open a pull request

## Data attribution

- [PokeAPI](https://pokeapi.co) — Pokemon data and game information
- [pkmn/ps](https://github.com/pkmn/ps) — Sprites and competitive data

Pokemon is a trademark of Nintendo / Creatures Inc. / GAME FREAK Inc. This project is not affiliated with or endorsed by any of these companies.
