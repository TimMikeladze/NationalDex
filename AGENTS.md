# Agent notes

- **PWA**: read [`docs/pwa.md`](docs/pwa.md) before touching the manifest,
  icons, splash screens, the app shell, the tab bar or `public/sw.js`.
  - The service worker caches pages only because every page is public and
    identical for everyone (user data lives in localStorage). If a page ever
    becomes per-user, the SW must stop caching navigations.
  - Bump `VERSION` in `public/sw.js` when its behaviour changes.
  - The tab bar and the manifest shortcuts both come from `PRIMARY_NAV`
    (`src/lib/nav.ts`); don't hand-write a second list.
  - Never size with `vh`/`h-screen`; use `--app-content-height`, `svh`, or
    `dvh` for full-screen overlays.
- Checks: `bun run check` (biome + tsc), `bun run test`, `bun run build`.
