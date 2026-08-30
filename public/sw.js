// NationalDex service worker.
//
// Kept deliberately small and dependency-free: it makes the installed app
// survive a lost connection rather than trying to mirror the whole site.
//
// - Navigations go network-first; when the network fails, a cached copy of
//   the page is served if there is one, otherwise the `/offline` page.
// - Next's hashed build assets (`/_next/static/...`) are immutable, so they
//   are cached on first use and served cache-first forever after.
// - Icons, sprites, and artwork are cached on first use and refreshed in
//   the background (stale-while-revalidate) so the dex keeps its pictures
//   offline without ever showing a stale one for long.
//
// Bump `VERSION` (or let a deploy do it) to drop every old cache on activate.

const VERSION = "v1";
const SHELL_CACHE = `nationaldex-shell-${VERSION}`;
const ASSET_CACHE = `nationaldex-assets-${VERSION}`;
const IMAGE_CACHE = `nationaldex-images-${VERSION}`;
const PAGE_CACHE = `nationaldex-pages-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/manifest.json", "/icons/logo-app.svg"];
const MAX_PAGES = 50;
const MAX_IMAGES = 300;

const IMAGE_HOSTS = [
  "play.pokemonshowdown.com",
  "raw.githubusercontent.com",
  "img.pokemondb.net",
  "assets.tcgdex.net",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("nationaldex-") && !key.endsWith(`-${VERSION}`),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
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

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (sameOrigin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (
    request.destination === "image" ||
    (sameOrigin && url.pathname.startsWith("/_next/image")) ||
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

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
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
