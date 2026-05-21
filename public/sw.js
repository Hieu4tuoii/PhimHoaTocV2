// Service Worker for Phim Hỏa Tốc PWA
// Required to satisfy Chrome PWA installable criteria

const CACHE_NAME = 'phimhoatoc-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy: always try network, no local caching
  // (image caching was explicitly removed per user request)
  event.respondWith(
    fetch(event.request).catch(() => {
      // If offline and it's a navigation request, return a basic offline page
      if (event.request.mode === 'navigate') {
        return new Response(
          '<html><body style="background:#020617;color:white;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui"><div style="text-align:center"><h1>Phim Hỏa Tốc</h1><p>Bạn đang offline. Vui lòng kiểm tra kết nối mạng.</p></div></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
      return new Response('', { status: 408 });
    })
  );
});
