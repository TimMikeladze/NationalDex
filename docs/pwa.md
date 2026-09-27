# PWA

NationalDex installs to a home screen and behaves like a native app on iOS and
Android. Platform APIs only — no PWA library.

## Pieces

| Piece | Where |
| --- | --- |
| Manifest | `src/app/manifest.ts` (served at `/manifest.webmanifest`) |
| Primary nav (tab bar + manifest shortcuts) | `src/lib/nav.ts` → `PRIMARY_NAV` |
| Icons (192, 512, maskable 512) | `src/app/pwa-icon/[variant]/route.tsx`, variants in `src/lib/pwa-assets.ts` |
| Apple touch icon (180) | `src/app/apple-icon.tsx` |
| iOS splash screens | `src/app/pwa-splash/[spec]/route.tsx`, device list in `src/lib/pwa-assets.ts` |
| Shell (safe areas, tab bar, view transitions) | `src/components/app-shell.tsx`, `src/app/globals.css` |
| Service worker | `public/sw.js`, registered by `src/components/pwa-register.tsx` |
| Offline fallback | `src/app/offline/page.tsx` |
| Theme-color sync | `src/components/theme-color.tsx` |

## Decisions

- **The shell is fixed, not the document.** `html, body` are `overflow: hidden`
  and `.app-shell` is `position: fixed; inset: 0`; `<main>` is the one scroll
  container. That is stricter than `overflow-x: clip` — the document can't
  scroll on either axis — and is what stops iOS standalone rubber-banding the
  whole app. The shell measures itself and publishes `--app-safe-top`,
  `--app-safe-bottom`, `--app-top-inset`, `--app-bottom-inset` (the tab bar's
  real height, i.e. the "tabbar offset") and `--app-content-height`. Toasts sit
  on `--app-bottom-inset`. Don't size anything with `vh`/`h-screen`; use
  `--app-content-height`, `svh`, or `dvh` for full-screen overlays.
- **Safe areas.** Shell pads top (status bar, black-translucent) and
  left/right (landscape notch). The tab bar pads the bottom (capped — see
  `.pb-safe-nav`). Sheets pad the edge they sit on.
- **Desktop means `lg` and not a short touch screen.** `lg`/`max-lg` are
  redefined in `globals.css` so an 844×390 landscape phone keeps the tab bar.
  `max-lg` uses the block form of `@custom-variant` — a comma in a variant media
  list breaks the CSS parse. `PHONE_QUERY` in `src/hooks/use-mobile.ts` mirrors
  the phone query for JS.
- **Tab bar: five destinations + More** (`PRIMARY_NAV`). The repo already
  carried five; dropping one to fit a 4+More template would remove a
  destination people use. Manifest shortcuts are derived from the same list
  and module load throws if a shortcut id is missing from it.
- **Splash screens** are rendered per `[pxW]x[pxH]-[light|dark]` spec; specs
  not in `SPLASH_DEVICES` 404 (`dynamicParams = false`), so the route can't be
  made to render arbitrary sizes. The in-app loading screen follows
  `prefers-color-scheme` so splash → loading screen → app doesn't flash.
- **Service worker.** Pages here are public and identical for every visitor
  (all user data — favorites, teams, decks — lives in `localStorage`), so
  visited pages are cached for offline use. **If a page ever becomes per-user
  (auth, cookies), the SW must stop caching navigations** and fall back to
  `/offline` only. Navigations: network-first with navigation preload, then the
  cached page, then `/offline` (precached along with its `/_next/static` assets
  so it renders styled). `/_next/static`, icons, splash images: cache-first.
  Sprites/artwork: stale-while-revalidate, capped. `/api/*`, non-GET and
  unknown cross-origin requests pass through. Versioned caches, old ones
  deleted on activate, `clients.claim()`. A waiting worker is only activated
  when the user taps **Reload** in the update toast (`SKIP_WAITING`).
- **Registration** is production-only (`NEXT_PUBLIC_SW_DEV=1` opts in during
  dev), `updateViaCache: "none"`, re-checked on `visibilitychange`. `/sw.js` is
  served `no-cache` with `Service-Worker-Allowed: /` (`next.config.ts`).
- **Zoom is locked on touch devices** (viewport `maximum-scale=1,
  user-scalable=no` for Android, `touch-action: pan-x pan-y` on `html` under
  `pointer: coarse` for iOS). Desktop keeps browser zoom. Inputs are ≥16px on
  touch so iOS doesn't zoom on focus.
- **Motion.** Route changes run through React `<ViewTransition default="page">`
  (Next `experimental.viewTransition`): 120ms fade out, 220ms 6px rise in.
  Buttons and `.pressable` scale to 0.96 on press. All of it is gated on
  `prefers-reduced-motion: no-preference`; browsers without view transitions
  just navigate.
- No proxy/middleware exists, so nothing gates `/sw.js`, the manifest, icons,
  splash images or `/offline`. If one is added, it must let those through.
