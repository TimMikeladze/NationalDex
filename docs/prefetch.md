# Link prefetching: on intent, not on sight

Oct 2026: nationaldex used ~2.4M Vercel CDN requests/day (~$1.20/day). Measured on production, one page view made ~137 requests, ~85 of them Next.js `<Link>` prefetches: by default, every link that scrolls into view prefetches its route (`?_rsc=`). The app shell nav prefetches ~10 routes on every page, and list pages (types, moves, cards) prefetch every row.

## Approach

- `@/components/link` wraps `next/link`. When `prefetch` isn't set, it passes `prefetch={false}` and calls `router.prefetch(href)` on pointer enter, touch start and focus. A click still navigates client-side; the route is usually warm by the time the click lands.
- Every `import Link from "next/link"` in `src/` imports `@/components/link` instead. Set `prefetch` explicitly on a link to get Next's default behaviour back.
- A Biome `noRestrictedImports` rule keeps `next/link` out of new code (the wrapper is the one exception).
