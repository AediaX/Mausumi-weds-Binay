/* Offline cache. Bump CACHE_VERSION whenever you change any file, so guests receive the update. */
const CACHE_VERSION = "mausumi-binay-v3-luxe-3d-roses";
const FILES = [
  "./", "index.html", "style.css", "app.js", "manifest.json",
  "audio/shehnai-dhol.mp3",
  "fonts/cormorant-garamond-latin-500-italic.woff2",
  "fonts/cormorant-garamond-latin-500-normal.woff2",
  "fonts/cormorant-garamond-latin-600-normal.woff2",
  "fonts/great-vibes-latin-400-normal.woff2",
  "fonts/lora-latin-400-normal.woff2",
  "fonts/lora-latin-500-normal.woff2",
  "fonts/noto-serif-devanagari-devanagari-400-normal.woff2",
  "fonts/noto-serif-devanagari-devanagari-600-normal.woff2",
  "fonts/playfair-display-latin-500-normal.woff2",
  "fonts/playfair-display-latin-700-normal.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon.svg",
  "libs/gsap.min.js",
  "libs/three.min.js", "roses.js",
  "img/ganesha.webp", "img/bouquet.webp", "img/petalA.webp", "img/petalB.webp", "img/petalC.webp",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // cache first; ignore ?guest=Name so every personalised link works offline
  const url = new URL(e.request.url);
  const key = url.origin === location.origin ? url.pathname : e.request.url;
  e.respondWith(caches.match(key.endsWith("/") ? "index.html" : e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
