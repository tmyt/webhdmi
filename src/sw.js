const CACHE_NAME = "%%version%%";
const CACHE_ASSETS = [
  "/",
  "/icon.png",
  "/index.html",
  "/sw.js",
  "/manifest.webmanifest",
  "/bootstrap/bootstrap.bundle.min.js",
  "/bootstrap/bootstrap.min.css",
  "/css/style.css",
  "/js/app.js",
  "/js/ble.js",
  "/js/hid.js",
  "/js/ms2109-quirks.js",
  "/js/quirks-core.mjs",
  "/remixicon/remixicon.css",
  "/remixicon/remixicon.eot",
  "/remixicon/remixicon.less",
  "/remixicon/remixicon.svg",
  "/remixicon/remixicon.symbol.svg",
  "/remixicon/remixicon.ttf",
  "/remixicon/remixicon.woff",
  "/remixicon/remixicon.woff2",
];

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

caches.open(CACHE_NAME).then((cache) => {
  return cache.addAll(CACHE_ASSETS);
});

self.addEventListener('fetch', (event) => {
  const pathname = new URL(event.request.url).pathname;
  if (!CACHE_ASSETS.includes(pathname)) return;
  event.respondWith(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.match(event.request)
          .then((response) => response || fetch(event.request))
          .then((response) => {
            cache.put(event.request, response.clone());
            return response;
          })
      })
  );
});