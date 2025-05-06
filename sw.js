// sw.js - Basic Service Worker for SNG Finance PWA

const CACHE_NAME = 'sng-finance-cache-v1';
// Add URLs of essential files to cache initially
const urlsToCache = [
  '/', // Cache the root (index.html)
  'index.html',
  // Add other essential assets like CSS (if separate), main JS (if separate)
  // Add paths to your icon files
  'images/icon-192.png',
  'images/icon-512.png',
  // Add paths to Firebase SDKs if you are NOT using the CDN links in HTML
  // (Using CDN links in HTML is generally easier for this setup)
  'https://cdn.tailwindcss.com', // Cache CDN resources if possible (may depend on CDN headers)
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event: Cache essential assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        // Use addAll for atomic caching (if one fails, all fail)
        // Use add for individual caching (allows partial success)
        // For CDNs, add might be safer as addAll can fail if one CDN resource is unavailable
        const cachePromises = urlsToCache.map(urlToCache => {
            // Use cache.add for standard resources, handle potential CDN issues separately if needed
            return cache.add(urlToCache).catch(err => {
                console.warn(`Service Worker: Failed to cache ${urlToCache}`, err);
            });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('Service Worker: Install completed, skipping waiting.');
        // Force the waiting service worker to become the active service worker.
        return self.skipWaiting();
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME]; // Only keep the current cache
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('Service Worker: Claiming clients.');
        // Take control of all open clients immediately.
        return self.clients.claim();
    })
  );
});

// Fetch event: Serve cached content when offline (Cache-first strategy)
self.addEventListener('fetch', event => {
  // console.log('Service Worker: Fetching', event.request.url);
  // Use a cache-first strategy for most requests
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          // console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }

        // Not in cache - fetch from network
        // console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            // We don't cache non-GET requests or opaque responses from cross-origin requests without CORS
            if (!networkResponse || networkResponse.status !== 200 || event.request.method !== 'GET' || networkResponse.type !== 'basic') {
                 // Don't cache non-GET requests or opaque responses
                 if (networkResponse && networkResponse.type !== 'basic') {
                      console.log(`Service Worker: Not caching opaque response for ${event.request.url}`);
                 }
                 return networkResponse;
            }


            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // console.log('Service Worker: Caching new resource:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
            console.error('Service Worker: Fetch failed; returning offline page or error response if available.', error);
            // Optionally return a fallback offline page:
            // return caches.match('/offline.html');
        });
      })
  );
});