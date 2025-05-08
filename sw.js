const CACHE_NAME = 'sng-finance-cache-v1'; // Increment cache version on updates
const urlsToCache = [
  '/', // Cache the root URL (your index.html)
  '/index.html', // Explicitly cache index.html
  '/manifest.json',
  '/sw.js', // Cache the service worker itself
  // Add paths to all your essential CSS, JS, and other assets
  // Ensure correct paths relative to the service worker's scope
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://www.gstatic.com/firebasejs/9.6.7/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore-compat.js',
  // Add paths to your own JS files, CSS files, icons, etc.
  // Example: '/css/style.css', '/js/app.js', '/icons/icon-192x192.png'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        // Use event.request.url for debugging if needed
        return cache.addAll(urlsToCache).catch(error => {
            console.error('Service Worker: Failed to cache some URLs:', error);
            // Log which URL failed for debugging
            Promise.all(urlsToCache.map(url =>
              fetch(url).then(response => {
                if (!response.ok) {
                  console.error(`Failed to fetch ${url}: ${response.status}`);
                }
                return response;
              }).catch(err => {
                console.error(`Failed to fetch ${url}: ${err}`);
              })
            ));
            throw error; // Re-throw to fail the install if critical assets are missing
        });
      })
      .then(() => self.skipWaiting()) // Activate the new service worker immediately
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // Remove old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of uncontrolled clients
  );
});

self.addEventListener('fetch', (event) => {
  //console.log('Service Worker: Fetching', event.request.url); // Log fetches for debugging
   event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return cached response
        if (response) {
          //console.log('Service Worker: Found in cache', event.request.url);
          return response;
        }

        // No cache hit - fetch from network
        console.log('Service Worker: Not in cache, fetching from network', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              // Don't cache opaque responses or error responses
               console.log('Service Worker: Invalid response received for', event.request.url);
              return response;
            }

             // Clone the response because it's a stream and can only be consumed once
            const responseToCache = response.clone();

            // Cache the new response (optional, for a cache-then-network or stale-while-revalidate)
            // This basic example uses cache-first for cached assets, network-only for others.
            // For dynamic content or new pages, you might want to cache successful network responses.
            // For this 404 issue on initial load, ensuring the *app shell* is cached is key.
            // If you want to cache new network requests:
            // caches.open(CACHE_NAME)
            //   .then((cache) => {
            //     cache.put(event.request, responseToCache);
            //   });

            return response;
          })
          .catch((error) => {
            // Network request failed. Check if it's the main page and serve a fallback if available.
            console.error('Service Worker: Fetch failed for', event.request.url, error);

            // If the request is for the main HTML file and it's not cached,
            // you might serve an offline fallback page.
            // This requires caching an 'offline.html' file during install.
             if (event.request.mode === 'navigate' && event.request.destination === 'document') {
                 // Example: return caches.match('/offline.html');
                 // For a basic fix of the initial 404, ensuring '/' is cached is enough.
                 // Returning nothing here will result in the browser's default offline page or error.
             }

             throw error; // Re-throw the error so the browser knows the fetch failed
          });
      })
   );
});

// Optional: Handle push notifications, background sync, etc.
