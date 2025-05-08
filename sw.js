// sw.js (Simplified)

const CACHE_VERSION = 3; // Increment version to force update
const CACHE_NAME = `sng-finance-cache-v${CACHE_VERSION}`;
const APP_SHELL_URLS = [
  '/', // Root path
  '/index.html', // Main HTML file
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  // Add other essential local assets if any (e.g., '/style.css')
];

// Install event: cache the app shell.
self.addEventListener('install', event => {
  console.log(`SW V${CACHE_VERSION}: Install event`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`SW V${CACHE_VERSION}: Caching app shell`);
        // Important: Cache essential files needed for the app to load initially.
        // Use fetch with cache: 'reload' to bypass browser cache during install
        const cachePromises = APP_SHELL_URLS.map(url => {
            return fetch(new Request(url, { cache: 'reload' }))
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Request for ${url} failed with status ${response.status}`);
                    }
                    return cache.put(url, response);
                })
                .catch(err => console.warn(`SW V${CACHE_VERSION}: Failed to cache ${url}`, err));
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log(`SW V${CACHE_VERSION}: App shell cached. Installation complete.`);
        return self.skipWaiting(); // Activate worker immediately
      })
      .catch(error => {
        console.error(`SW V${CACHE_VERSION}: Installation failed`, error);
      })
  );
});

// Activate event: remove old caches.
self.addEventListener('activate', event => {
  console.log(`SW V${CACHE_VERSION}: Activate event`);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`SW V${CACHE_VERSION}: Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log(`SW V${CACHE_VERSION}: Activation complete.`);
      return self.clients.claim(); // Take control of clients
    })
  );
});

// Fetch event: Serve app shell from cache, network for others.
// Fallback to index.html for navigation requests.
self.addEventListener('fetch', event => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  // Ignore non-GET requests and Firestore API calls
  if (request.method !== 'GET' || requestUrl.hostname.includes('firestore.googleapis.com')) {
    // Let the browser handle it
    return;
  }

  // For navigation requests (opening the app or navigating between pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request) // Try network first for navigation
        .catch(() => {
          // Network failed, serve index.html from cache
          console.log(`SW V${CACHE_VERSION}: Network fetch failed for navigation, serving /index.html from cache.`);
          return caches.match('/index.html', { cacheName: CACHE_NAME });
        })
    );
    return;
  }

  // For non-navigation requests (assets like CSS, JS, images)
  event.respondWith(
    caches.match(request, { cacheName: CACHE_NAME })
      .then(cachedResponse => {
        // Return cached response if found
        if (cachedResponse) {
          // console.log(`SW V${CACHE_VERSION}: Serving from cache: ${requestUrl.pathname}`);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        // console.log(`SW V${CACHE_VERSION}: Fetching from network: ${requestUrl.pathname}`);
        return fetch(request).then(networkResponse => {
            // Don't cache opaque responses (e.g., from CDNs without CORS) unless necessary
            if (networkResponse.type === 'opaque') {
                return networkResponse;
            }

            // Cache the fetched response if it's valid
            if (networkResponse && networkResponse.ok) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, responseToCache);
                });
            }
            return networkResponse;
        }).catch(error => {
            console.error(`SW V${CACHE_VERSION}: Network fetch failed for ${requestUrl.pathname}`, error);
            // Optionally return a fallback placeholder for assets like images
        });
      })
  );
});
```

**2. Address the Firestore Index Error**

Your console clearly shows: `Error fetching transactions for nitin: {"code":"failed-precondition","name":"FirebaseError"} Firestore requires a composite index for this query.`

This means the query `transactionsRef.orderBy('date', 'desc').orderBy('createdAt', 'desc')` **needs** a composite index.

* **Go to your Firebase Console.**
* Navigate to **Build > Firestore Database > Indexes**.
* Click on the **"Composite"** tab.
* Click **"Create Index"**.
* **Collection ID:** Enter `transactions`
* **Fields to index:**
    * Add field: `date`, Order: **Descending**
    * Add field: `createdAt`, Order: **Descending**
* **Query scopes:** Select **Collection group** (This is important because your `transactions` collections are nested under each user document).
* Click **"Create"**.

It will take a few minutes for the index to build. You can monitor its status in the Firebase console.

**3. Re-enable the Second `orderBy` in `index.html`**

*Once the index is built and enabled in Firebase*, go back to your `index.html` file (`finance_pwa_html_v5` or whichever is current) and find the `setupFirestoreListeners` function. Uncomment the second `orderBy`:

```javascript
            // Inside setupFirestoreListeners function...
            if (transactionsRef) {
                unsubscribeTransactions = transactionsRef
                    .orderBy('date', 'desc')
                    .orderBy('createdAt', 'desc') // <-- UNCOMMENT THIS LINE
                    .onSnapshot(snapshot => {
                       // ... rest of snapshot handling
                    }, error => {
                       // ... rest of error handling
                    });
            } //...
```

**Testing Steps (After completing 1, 2, and 3):**

1.  **Upload/Deploy:** Ensure the updated `sw.js` and `index.html` (with the re-enabled `orderBy`) are deployed.
2.  **Clear Cache/Data and Unregister SW:** On your testing device (iPad/iPhone), *thoroughly* remove the old PWA icon, clear website data for your site in Safari settings, and close Safari.
3.  **Open in Safari:** Load the URL.
4.  **Check Console:** Look for successful Service Worker registration (`ServiceWorker registration successful`) and check if the Firestore "failed-precondition" error for transactions is gone.
5.  **Add to Home Screen.**
6.  **Launch from Home Screen:** It should now launch without the 404 error and load transactions correctly (using the index).

This combination of a simpler, more robust service worker and creating the necessary Firestore index should resolve both the 404 launch error and the transaction loading err
