# SEO & Dynamic OG Image Plan for nationaldex

## Current State Assessment

**What exists:**
- Basic root `metadata` in `layout.tsx` — just title "nationaldex" and description "minimal pokédex"
- PWA manifest with icons
- `generateStaticParams` for Pokémon pages (1,025+ pages pre-rendered)
- Rich Pokémon data available server-side: stats, types, abilities, sprites, genus, descriptions

**What's completely missing:**
- No `generateMetadata` on any dynamic route (Pokémon, moves, abilities, items, types, locations)
- No Open Graph images anywhere
- No Twitter Card metadata
- No `sitemap.xml` / `sitemap.ts`
- No `robots.txt` / `robots.ts`
- No structured data (JSON-LD)
- No canonical URLs
- `@vercel/og` not installed

---

## Implementation Plan

### Step 1: Install `@vercel/og` dependency

Install `@vercel/og` which provides the `ImageResponse` API for generating dynamic OG images at the edge using Satori (SVG rendering) under the hood. This is the standard Next.js approach.

```bash
bun add @vercel/og
```

**File:** `package.json`

---

### Step 2: Create the Pokémon dynamic OG image route

Create `src/app/pokemon/[id]/opengraph-image.tsx` — Next.js App Router convention that auto-wires the OG image for each Pokémon page.

**File:** `src/app/pokemon/[id]/opengraph-image.tsx`

This route will:
- Accept the `[id]` param
- Look up the Pokémon using `@pkmn/dex` (via `getSpecies`) for name, types, base stats, num
- Render a 1200x630 image using `ImageResponse` with JSX:
  - **Background**: gradient based on the Pokémon's primary type color (from `TYPE_COLORS`)
  - **Pokémon sprite**: fetched from PokemonDB Home sprites URL (external image fetch)
  - **Pokémon name** and **#number**
  - **Type badges**: styled pills with type colors
  - **Stat bars**: horizontal bars for HP, Atk, Def, SpA, SpD, Spe with labels and values
  - **"nationaldex" branding** in the corner
- Export `generateStaticParams` so all OG images are pre-built at build time
- Export `size`, `contentType`, and `alt` metadata

The stat bars will be proportional (max stat 255) with type-colored fills. The design will use the JetBrains Mono font (fetched at build) to match the site's monospace aesthetic.

Key technical notes:
- Satori (underlying `@vercel/og`) only supports a subset of CSS — flexbox only, no grid, no CSS variables
- External images (sprites) must be fetched as `ArrayBuffer` and embedded
- Font files must be fetched/read as `ArrayBuffer` too
- Uses `export { size, contentType }` convention for Next.js auto-discovery

---

### Step 3: Add `generateMetadata` to the Pokémon page

**File:** `src/app/pokemon/[id]/page.tsx`

Add a `generateMetadata` export that:
- Resolves the Pokémon species from `@pkmn/dex`
- Fetches the pokedex entry for the description
- Returns:
  - `title`: `"Pikachu (#25) | nationaldex"` — Pokémon name with dex number
  - `description`: The Pokédex flavor text or genus (e.g., "Mouse Pokémon. Electric type. Base stat total: 320.")
  - `openGraph.title`, `openGraph.description`, `openGraph.type: "website"`
  - `twitter.card: "summary_large_image"` — ensures the OG image displays full-width on Twitter/X
  - The OG image is auto-discovered by Next.js from the `opengraph-image.tsx` sibling — no manual URL needed

---

### Step 4: Enhance root layout metadata

**File:** `src/app/layout.tsx`

Improve the base metadata to include:
- `metadataBase`: Set to the production URL (e.g., `https://nationaldex.com` or the Vercel URL) — critical for OG image absolute URL resolution
- `openGraph` defaults: site name, type, locale
- `twitter.card: "summary_large_image"` as default
- Proper `title.template`: `"%s | nationaldex"` so child pages get consistent title formatting

---

### Step 5: Add `generateMetadata` to all other dynamic routes

Apply the same pattern to every dynamic route:

| Route | Title Format | Description |
|-------|-------------|-------------|
| `moves/[name]/page.tsx` | `"Thunderbolt \| nationaldex"` | Move type, power, accuracy, damage class |
| `abilities/[name]/page.tsx` | `"Levitate \| nationaldex"` | Ability short description |
| `items/[name]/page.tsx` | `"Leftovers \| nationaldex"` | Item description and category |
| `types/[name]/page.tsx` | `"Electric Type \| nationaldex"` | Type matchup summary |
| `locations/[name]/page.tsx` | `"Route 1 \| nationaldex"` | Region and area info |

Each gets a `generateMetadata` function pulling data from the existing server-side utilities (`getMove`, `getAbility`, `getItem`, `getType` from `@/lib/pkmn`).

---

### Step 6: Add `robots.ts`

**File:** `src/app/robots.ts`

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/settings", "/favorites", "/teams/", "/lists/"],
    },
    sitemap: "https://<YOUR_DOMAIN>/sitemap.xml",
  };
}
```

Disallow private/user-specific pages. Allow all public content pages.

---

### Step 7: Add `sitemap.ts`

**File:** `src/app/sitemap.ts`

Generate a comprehensive sitemap including:
- `/` (home)
- `/pokemon/[id]` for all 1,025+ Pokémon (from `getAllSpecies` with forms)
- `/moves/[name]` for all moves (from `getAllMoves`)
- `/abilities/[name]` for all abilities (from `getAllAbilities`)
- `/items/[name]` for all items (from `getAllItems`)
- `/types/[name]` for all 18 types (from `getAllTypes`)
- `/locations/[name]` — static list or from API
- Static pages: `/about`, `/comparison`, `/whos-that-pokemon`

Each entry gets `lastModified`, `changeFrequency`, and `priority`. Pokémon pages get highest priority.

---

### Step 8: Add structured data (JSON-LD) to Pokémon pages

**File:** `src/app/pokemon/[id]/page.tsx`

Add a `<script type="application/ld+json">` in the page component with schema.org markup. Use `WebPage` or `Thing` schema:

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Pikachu",
  "description": "Mouse Pokémon...",
  "image": "https://.../pokemon/pikachu/opengraph-image"
}
```

This helps search engines understand the page content and can enable rich results.

---

## Summary of Files Created/Modified

| File | Action |
|------|--------|
| `package.json` | Add `@vercel/og` |
| `src/app/layout.tsx` | Enhance metadata (metadataBase, title template, OG defaults) |
| `src/app/pokemon/[id]/opengraph-image.tsx` | **NEW** — Dynamic OG image with stats |
| `src/app/pokemon/[id]/page.tsx` | Add `generateMetadata` + JSON-LD |
| `src/app/moves/[name]/page.tsx` | Add `generateMetadata` |
| `src/app/abilities/[name]/page.tsx` | Add `generateMetadata` |
| `src/app/items/[name]/page.tsx` | Add `generateMetadata` |
| `src/app/types/[name]/page.tsx` | Add `generateMetadata` |
| `src/app/locations/[name]/page.tsx` | Add `generateMetadata` |
| `src/app/robots.ts` | **NEW** — robots.txt generation |
| `src/app/sitemap.ts` | **NEW** — XML sitemap generation |

---

## OG Image Design Spec

```
┌──────────────────────────────────────────────────────────┐
│  [gradient bg: primary type color → darker]              │
│                                                          │
│   ┌─────────┐                                            │
│   │         │   PIKACHU           #025                   │
│   │ (sprite)│   ┌──────────┐                             │
│   │         │   │ Electric │                             │
│   └─────────┘   └──────────┘                             │
│                                                          │
│   HP  ████████████░░░░░░░░░░░░░  35                      │
│   Atk ██████████████░░░░░░░░░░░  55                      │
│   Def ████████████░░░░░░░░░░░░░  40                      │
│   SpA █████████████████░░░░░░░░  50                      │
│   SpD █████████████████░░░░░░░░  50                      │
│   Spe ████████████████████████░  90                      │
│                                          nationaldex     │
└──────────────────────────────────────────────────────────┘
```

- **Size**: 1200x630 (standard OG)
- **Font**: JetBrains Mono (matches site)
- **Colors**: Type-derived gradients using existing `TYPE_COLORS` map
- **Sprite**: PokemonDB Home sprite (high quality, good form coverage)
