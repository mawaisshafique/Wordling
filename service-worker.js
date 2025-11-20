// Reads ?v=VERSION and ?name=PRODUCT_NAME from the SW URL
const params = new URL(self.location).searchParams;
const VERSION = params.get("v") || "0";
const APPNAME = (params.get("name") || "app").replace(/\s+/g, "-").toLowerCase();
const CACHE_NAME = `${APPNAME}-v${VERSION}`;

self.addEventListener("message", (event) => {
    if (!event.data || event.data.type !== "CACHE_URLS") return;
    const urls = event.data.urls.map(u => new URL(u, self.registration.scope).toString());
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urls)).catch(console.warn)
    );
});

self.addEventListener("install", (event) => { self.skipWaiting(); });

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true })
            .then(resp => resp || fetch(event.request))
    );
});
