// NationalDex service worker. See docs/pwa.md.
//
// Kept deliberately small and dependency-free: it makes the installed app
// survive a lost connection rather than trying to mirror the whole site.
//
// - Navigations go network-first (with navigation preload); when the network
//   fails, a cached copy of the page is served if there is one, otherwise the
//   precached `/offline` page. Pages are cached because every page here is
//   public and the same for everyone — user data lives in localStorage. If a
//   page ever becomes per-user, stop caching navigations.
// - Content-hashed build assets (`/_next/static/...`) and the app's icons and
//   splash images are immutable, so they are cache-first.
// - Sprites and artwork are cached on first use and refreshed in the
//   background (stale-while-revalidate), capped.
// - `/api/*`, non-GET, and cross-origin requests to anything but the sprite
//   hosts are left alone.
//
// Bump `VERSION` whenever this file's behaviour changes: activate drops every
// cache from an older version.

const VERSION = "v2";
const SHELL_CACHE = `nationaldex-shell-${VERSION}`;
const ASSET_CACHE = `nationaldex-assets-${VERSION}`;
const IMAGE_CACHE = `nationaldex-images-${VERSION}`;
const PAGE_CACHE = `nationaldex-pages-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/icons/logo-app.svg"];
const MAX_PAGES = 50;
const MAX_IMAGES = 300;

const IMAGE_HOSTS = [
  "play.pokemonshowdown.com",
  "raw.githubusercontent.com",
  "img.pokemondb.net",
  "assets.tcgdex.net",
];

// Same-origin paths whose bytes never change at a given URL.
const IMMUTABLE_PREFIXES = [
  "/_next/static/",
  "/pwa-icon/",
  "/pwa-splash/",
  "/apple-icon",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(PRECACHE);

      // The offline page is only useful styled, so cache the build assets it
      // links to as well. They are content-hashed, so they go in the asset
      // cache like any other.
      const offline = await cache.match(OFFLINE_URL);
      if (offline) {
        const html = await offline.text();
        const assets = [
          ...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? []),
        ];
        const assetCache = await caches.open(ASSET_CACHE);
        await Promise.all(
          assets.map((url) => assetCache.add(url).catch(() => undefined)),
        );
      }

      // The very first worker has nothing to replace and can take over at
      // once. An update waits for the user to tap "Reload" (SKIP_WAITING), so
      // nobody is swapped onto a new bundle mid-edit.
      if (!self.registration.active) await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("nationaldex-") && !key.endsWith(`-${VERSION}`),
          )
          .map((key) => caches.delete(key)),
      );
      // Lets the navigation request start while the worker boots.
      await self.registration.navigationPreload?.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin && url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (
    sameOrigin &&
    IMMUTABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  ) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (
    (sameOrigin &&
      (request.destination === "image" ||
        url.pathname.startsWith("/_next/image"))) ||
    IMAGE_HOSTS.includes(url.hostname)
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, MAX_IMAGES));
    return;
  }

  // The shell is precached so it exists offline, but `VERSION` does not
  // change per deploy, so it must still refresh from the network.
  if (sameOrigin && PRECACHE.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});

async function handleNavigation(event) {
  const { request } = event;
  try {
    const response = (await event.preloadResponse) || (await fetch(request));
    // A redirected response replayed from cache for a navigation is rejected
    // by the browser as a security error, so only the final page is kept.
    if (response.ok && !response.redirected) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, response.clone());
      trim(cache, MAX_PAGES);
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return (
      offline ??
      new Response("You are offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") {
        cache.put(request, response.clone());
        if (max) trim(cache, max);
      }
      return response;
    })
    .catch((error) => {
      if (cached) return cached;
      throw error;
    });
  return cached ?? network;
}

// Caches are FIFO-ish: `keys()` returns entries in insertion order, so
// dropping from the front drops the oldest.
async function trim(cache, max) {
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(
    keys.slice(0, keys.length - max).map((k) => cache.delete(k)),
  );
}
