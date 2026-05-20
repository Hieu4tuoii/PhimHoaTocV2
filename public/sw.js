// Minimal Service Worker to satisfy PWA installation requirements

const CACHE_NAME = 'phimhoatoc-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Required event listener to pass Chrome PWA installable criteria
  // We don't perform local caching here since the API is highly dynamic
  // and image caching was explicitly requested to be removed previously.
});
