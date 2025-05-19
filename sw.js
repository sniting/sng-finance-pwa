// sw.js - Service Worker for SNG Finance PWA

const CACHE_NAME = 'sng-finance-cache-v2'; // Increment cache version
// Add URLs of essential files to cache initially
const urlsToCache = [
  '/', 
  '/index.html',
  '/manifest.json',
  // Fix icon paths to match actual paths in your manifest
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
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
  
  // Wait until the caching is complete
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        
        // First cache the index.html (most critical file)
        return cache.add('/index.html')
          .then(() => {
            console.log('Index.html cached successfully');
            
            // Then cache the rest (if index.html caching fails, the service worker won't install)
            return Promise.all(
              urlsToCache.map(urlToCache => {
                // Skip index.html since we already cached it
                if (urlToCache === '/index.html') return Promise.resolve();
                
                return cache.add(urlToCache)
                  .catch(err => {
                    console.warn(`Service Worker: Non-critical file caching failed for ${urlToCache}`, err);
                    // Continue installation even if non-critical resources fail to cache
                    return Promise.resolve();
                  });
              })
            );
          });
      })
      .then(() => {
        console.log('Service Worker: Install completed, skipping waiting.');
        return self.skipWaiting();
      })
  );
});

// Activate event: Clean up old caches and claim clients
// Add this code to your service worker (sw.js) to clear icon caches

// In the activate event handler, add this specific cache clearing code
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME]; // Only keep the current cache version
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Force clear any cached icon resources
      caches.open(CACHE_NAME).then(cache => {
        return cache.keys().then(requests => {
          const iconRequests = requests.filter(request => 
            request.url.includes('icon-') && 
            request.url.includes('.png')
          );
          
          return Promise.all(
            iconRequests.map(request => {
              console.log('Service Worker: Removing cached icon:', request.url);
              return cache.delete(request);
            })
          );
        });
      }),
      
      // Take control of all open clients immediately
      self.clients.claim().then(() => {
        console.log('Service Worker: Claimed all clients');
      })
    ])
  );
});

// Add this function to manually clear icon caches
function clearIconCaches() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      action: 'clearIconCache'
    });
    console.log('Sent clear icon cache request to service worker');
  }
}

// Single message handler for service worker actions
self.addEventListener('message', event => {
  if (!event.data || !event.data.action) return;

  switch (event.data.action) {
    case 'clearIconCache':
      console.log('Service Worker: Received request to clear icon cache');
      caches.open(CACHE_NAME)
        .then(cache => cache.keys())
        .then(requests => {
          const iconRequests = requests.filter(request =>
            request.url.includes('icon-') && request.url.includes('.png')
          );
          return Promise.all(
            iconRequests.map(request => {
              console.log('Service Worker: Clearing cached icon:', request.url);
              return cache.delete(request);
            })
          );
        })
        .then(() => {
          // Notify clients that cache was cleared
          self.clients.matchAll().then(clients => {
            clients.forEach(client =>
              client.postMessage({ type: 'ICONS_CLEARED' })
            );
          });
        });
      break;

    case 'skipWaiting':
      self.skipWaiting();
      break;
  }
});

// Create offline page content
const offlineHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SNG Finance - Offline</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 20px; background-color: #f8fafc; }
    h1 { color: #4f46e5; margin-bottom: 20px; }
    .container { max-width: 500px; margin: 60px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    button { background-color: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; cursor: pointer; margin-top: 20px; }
    button:hover { background-color: #4338ca; }
    p { line-height: 1.6; color: #4b5563; }
  </style>
</head>
<body>
  <div class="container">
    <h1>SNG Finance</h1>
    <p>You appear to be offline. The app requires an internet connection for some features.</p>
    <p>Your previously loaded data should still be available.</p>
    <button onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>`;

// Create the offline response object
const offlineResponse = new Response(offlineHTML, {
  headers: { 'Content-Type': 'text/html' }
});

// Fetch event: Improved strategy with better error handling
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Handle navigation requests (app shell)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // Try network first
      fetch(event.request)
        .catch(() => {
          // If network fails, try to serve index.html from cache
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
  
  // Special handling for exact root URL or index.html
  if (event.request.url.endsWith('/') || event.request.url.endsWith('/index.html')) {
    event.respondWith(
      // Try network first for root/index
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html')
            .then(cachedIndex => {
              if (cachedIndex) return cachedIndex;
              return offlineResponse;
            });
        })
    );
    return;
  }
  
  // For API or dynamic data requests, use network-first strategy
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('firebase')) {
    event.respondWith(
      fetch(event.request)
        .catch(error => {
          console.log('Network request failed for API/Firebase, no caching attempted:', error);
          // For API requests, we typically don't have a cached fallback
          // Just let the error propagate to the app
          throw error;
        })
    );
    return;
  }
  
  // For all other requests (assets, scripts, etc.), use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // For non-cached resources, fetch from network and cache for next time
        return fetch(event.request.clone())
          .then(networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Cache the new resource for next time
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('Service Worker: Cached new resource:', event.request.url);
              })
              .catch(err => {
                console.warn('Failed to cache resource:', event.request.url, err);
              });
              
            return networkResponse;
          })
          .catch(error => {
            console.error('Service Worker: Fetch failed:', error);
            
            // For image requests, return a cached placeholder
            if (event.request.destination === 'image') {
              return caches.match('/icons/icon-192x192.png')
                .then(placeholderImage => {
                  if (placeholderImage) return placeholderImage;
                  // If no placeholder, just propagate the error
                  throw error;
                });
            }
            
            // For HTML requests, serve the offline page
            if (event.request.headers.get('accept') && 
                event.request.headers.get('accept').includes('text/html')) {
              return offlineResponse;
            }
            
            // For other resources, propagate the error
            throw error;
          });
      })
  );
});

