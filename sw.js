// sw.js - Service Worker for SNG Finance PWA

const CACHE_NAME = 'sng-finance-cache-v1';
// Add URLs of essential files to cache initially
const urlsToCache = [
  '/', // Cache the root (index.html)
  '/index.html',
  '/manifest.json',
  // Add CSS and JS files
  '/images/icon-192.png',
  '/images/icon-512.png',
  // Cache external resources
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://www.gstatic.com/firebasejs/9.6.7/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.6.7/firebase-auth-compat.js'
];

// Install event: Cache essential assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        // Use individual caching to allow partial success
        const cachePromises = urlsToCache.map(urlToCache => {
            return cache.add(urlToCache).catch(err => {
                console.warn(`Service Worker: Failed to cache ${urlToCache}`, err);
            });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('Service Worker: Install completed, skipping waiting.');
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
        return self.clients.claim();
    })
  );
});

// Create a simple offline page for fallback
const offlineResponse = new Response(
  `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SNG Finance - Offline</title>
    <style>
      body { font-family: sans-serif; text-align: center; padding: 20px; }
      h1 { color: #4f46e5; }
    </style>
  </head>
  <body>
    <h1>SNG Finance</h1>
    <p>You appear to be offline. Please check your internet connection.</p>
    <button onclick="window.location.reload()">Try Again</button>
  </body>
  </html>`,
  {
    headers: { 'Content-Type': 'text/html' }
  }
);

// Fetch event: Updated strategy to improve PWA navigation
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Handle navigation requests specially - important for PWA functionality
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If navigation fails, serve index.html from cache if available
        return caches.match('/index.html')
          .then(cachedIndex => {
            if (cachedIndex) {
              console.log('Service Worker: Serving cached index.html for navigation');
              return cachedIndex;
            }
            // As a last resort, show the offline page
            console.log('Service Worker: Serving offline page');
            return offlineResponse;
          });
      })
    );
    return;
  }

  // Standard cache-first strategy for other requests
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache - fetch from network
        return fetch(event.request.clone()).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
          console.error('Service Worker: Fetch failed; returning offline fallback if appropriate.', error);
          // For image requests, return a placeholder or fallback
          if (event.request.destination === 'image') {
            // You could return a placeholder image here
            return caches.match('/images/icon-192.png');
          }
          
          // If it's an HTML request, serve the offline page
          if (event.request.headers.get('accept').includes('text/html')) {
            return offlineResponse;
          }
          
          // Otherwise, let the error propagate
          throw error;
        });
      })
  );
});
