// sw.js

// Increment version number when you update the cache content
const CACHE_VERSION = 2;
const CACHE_NAME = `sng-finance-cache-v${CACHE_VERSION}`;

// Files to cache - Use absolute paths from the root if deploying at root
const urlsToCache = [
  '/', // Cache the root path
  '/index.html', // Explicitly cache index.html at the root
  '/manifest.json',
  // Add paths to your CSS, other JS files if any
  // '/style.css',
  // '/app.js', // If you split your JS
  '/icon-192x192.png',
  '/icon-512x512.png',
  // CDNs are usually handled by the browser cache, but caching them can improve offline reliability
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://www.gstatic.com/firebasejs/9.6.7/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore-compat.js'
];

// Install event: opens the cache and adds core files to it.
self.addEventListener('install', event => {
  console.log(`Service Worker V${CACHE_VERSION}: Installing...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`Service Worker V${CACHE_VERSION}: Caching app shell`);
        // Use { cache: 'reload' } to ensure fresh copies are fetched during install
        const cachePromises = urlsToCache.map(urlToCache => {
            return cache.add(new Request(urlToCache, {cache: 'reload'})).catch(err => {
                console.warn(`Failed to cache ${urlToCache}:`, err);
            });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log(`Service Worker V${CACHE_VERSION}: Installation complete, app shell cached.`);
        return self.skipWaiting(); // Activate the new service worker immediately
      })
      .catch(error => {
        console.error(`Service Worker V${CACHE_VERSION}: Caching failed`, error);
      })
  );
});

// Activate event: cleans up old caches.
self.addEventListener('activate', event => {
  console.log(`Service Worker V${CACHE_VERSION}: Activating...`);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log(`Service Worker V${CACHE_VERSION}: Clearing old cache:`, cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log(`Service Worker V${CACHE_VERSION}: Activation complete, old caches cleared.`);
      return self.clients.claim(); // Take control of all open clients immediately
    })
  );
});

// Fetch event: serves cached content when offline or for specified routes.
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Ignore Firestore requests and non-GET requests
    if (requestUrl.hostname.includes('firestore.googleapis.com') || event.request.method !== 'GET') {
        // Let the browser handle it
        return;
    }

    // Strategy: Cache falling back to network, with fallback to /index.html for navigation
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Cache hit - return response
                if (cachedResponse) {
                    // console.log(`SW: Serving from cache: ${requestUrl.pathname}`);
                    return cachedResponse;
                }

                // Not in cache - fetch from network
                // console.log(`SW: Fetching from network: ${requestUrl.pathname}`);
                return fetch(event.request).then(
                    networkResponse => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200) {
                             // If fetch failed and it's a navigation request, serve index.html
                            if (event.request.mode === 'navigate') {
                                console.log(`SW: Fetch failed for navigation, serving /index.html fallback.`);
                                return caches.match('/index.html');
                            }
                            // For non-navigation requests, just return the error response
                            return networkResponse;
                        }

                        // Valid response - cache it and return it
                        // console.log(`SW: Caching network response for: ${requestUrl.pathname}`);
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                ).catch(error => {
                    // Network request failed entirely (e.g., offline)
                    console.log(`SW: Network fetch failed for ${requestUrl.pathname}. Error:`, error);
                    // If it was a navigation request, serve index.html from cache
                    if (event.request.mode === 'navigate') {
                        console.log(`SW: Serving /index.html fallback due to network error.`);
                        return caches.match('/index.html');
                    }
                    // For other failed requests, just let the error propagate
                    // (or return a specific offline fallback page/image if desired)
                });
            })
    );
});

