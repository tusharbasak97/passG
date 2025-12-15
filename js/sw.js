/* Service Worker for PassG PWA */
const CACHE_VERSION = "passg-v1.1";
const CACHE_URLS = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/js/main.js",
  "/js/generators/password.js",
  "/js/generators/passphrase.js",
  "/js/generators/username.js",
  "/js/utils/crypto.js",
  "/js/utils/storage.js",
  "/js/utils/ui.js",
  "/assets/data/eff_large_wordlist.txt",
  "/assets/images/favicon-32x32.png",
  "/assets/images/favicon-16x16.png",
  "/assets/images/apple-touch-icon.png",
  "/assets/images/android-chrome-192x192.png",
  "/assets/images/android-chrome-512x512.png",
  "/assets/site.webmanifest",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css",
];

// Install event - cache all resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(CACHE_URLS).catch((err) => {
        // Continue even if some resources fail
        return Promise.all(
          CACHE_URLS.map((url) => cache.add(url).catch((err) => {}))
        );
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (
    !event.request.url.startsWith(self.location.origin) &&
    !event.request.url.includes("fonts.googleapis.com") &&
    !event.request.url.includes("cdnjs.cloudflare.com")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Cache successful GET requests
          if (
            event.request.method === "GET" &&
            networkResponse.status === 200
          ) {
            return caches.open(CACHE_VERSION).then((cache) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          // Return offline fallback for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
          throw err;
        });
    })
  );
});

// Background sync for offline actions (future enhancement)
self.addEventListener("sync", (event) => {
  // Could be used for syncing history or settings
});

// Push notifications (future enhancement)
self.addEventListener("push", (event) => {
  // Could notify users of security tips or updates
});
