// sw.js

const CACHE_NAME = 'sng-finance-cache-v1';
const urlsToCache = [
  './', // Alias for index.html
  './index.html',
  './manifest.json',
  // Add paths to your CSS, other JS files if any
  // './style.css',
  // './app.js', // If you split your JS
  './icon-192x192.png',
  './icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://www.gstatic.com/firebasejs/9.6.7/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore-compat.js'
  // Add other CDN links if any
];

// Install event: opens the cache and adds core files to it.
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete, app shell cached.');
        return self.skipWaiting(); // Activate the new service worker immediately
      })
      .catch(error => {
        console.error('Service Worker: Caching failed', error);
      })
  );
});

// Activate event: cleans up old caches.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete, old caches cleared.');
      return self.clients.claim(); // Take control of all open clients
    })
  );
});

// Fetch event: serves cached content when offline or for specified routes.
self.addEventListener('fetch', event => {
  // We only want to handle GET requests for navigation
  if (event.request.method === 'GET' && event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Cache hit - return response
          if (response) {
            return response;
          }
          // Not in cache, fetch from network
          return fetch(event.request).then(
            networkResponse => {
              // Check if we received a valid response
              if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                // If not, and it's a navigation request, try to return index.html as a fallback
                // This helps with single-page apps where routes are client-side
                return caches.match('./index.html');
              }
              return networkResponse; // Return the network response
            }
          ).catch(() => {
            // Network request failed, try to return index.html from cache as a fallback
            return caches.match('./index.html');
          });
        })
    );
  } else if (urlsToCache.includes(event.request.url) || (event.request.url.startsWith(self.location.origin) && !event.request.url.includes('/firestore.googleapis.com/'))) {
    // For other specified assets or same-origin requests (excluding Firestore)
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response; // Serve from cache
          }
          // Not in cache, fetch from network, cache it, then return
          return fetch(event.request).then(
            networkResponse => {
              // Check if we received a valid response
              if(!networkResponse || networkResponse.status !== 200 ) { // Allow non-basic types for CDNs
                return networkResponse;
              }

              // IMPORTANT: Clone the response. A response is a stream
              // and because we want the browser to consume the response
              // as well as the cache consuming the response, we need
              // to clone it so we have two streams.
              const responseToCache = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });

              return networkResponse;
            }
          );
        })
    );
  }
  // For other requests (like Firestore API calls), let them go directly to the network.
});
```
