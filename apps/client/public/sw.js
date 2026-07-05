/* eslint-disable no-undef */

const CACHE_NAME = "kloqra-static-cache-v1";

// Caching static assets on install
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass API requests and socket connections entirely (network-only)
  if (
    url.pathname.startsWith("/api/") ||
    request.url.includes(":3001") ||
    request.url.includes("socket.io")
  ) {
    return;
  }

  // Only handle standard GET requests
  if (request.method !== "GET") {
    return;
  }

  // For static assets, HTML, pages, and chunks: Stale-While-Revalidate caching strategy
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Offline fallback
            return cachedResponse;
          });

        return cachedResponse || fetchPromise;
      });
    })
  );
});
