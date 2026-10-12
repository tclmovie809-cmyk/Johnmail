const CACHE_NAME = "john-miras-messenger-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./friends.jpg",
  "./xelamarie.jpg",
  "./jester.jpg",
  "./jester-video.mp4",
  "./call-sound.mp3"
];

// I-save ang app files para sa offline use.
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      const results = await Promise.allSettled(
        APP_FILES.map(file => cache.add(file))
      );

      const failed = results
        .map((result, index) => ({ result, file: APP_FILES[index] }))
        .filter(item => item.result.status === "rejected");

      if (failed.length) {
        console.warn("May files na hindi na-cache:", failed);
      }

      await self.skipWaiting();
    })
  );
});

// Alisin ang lumang cache kapag may bagong bersyon.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Gamitin muna ang naka-cache na files.
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(async cached => {
      if (cached) return cached;

      try {
        const response = await fetch(event.request);

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }

        return response;
      } catch (error) {
        if (event.request.mode === "navigate") {
          const offlinePage = await caches.match("./index.html");
          if (offlinePage) return offlinePage;
        }

        return new Response("Offline: Hindi available ang file na ito.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
    })
  );
});
