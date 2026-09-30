// public/sw.js
//
// Service worker minimal. Son seul rôle ici est de satisfaire la condition
// technique qui permet à Chrome/Android de proposer "Installer l'application" :
// avoir un service worker enregistré et actif. Depuis Chrome 108 (mobile) et
// 112 (desktop), un gestionnaire "fetch" n'est plus obligatoire pour ça, mais
// on en garde un simple pour mettre en cache l'essentiel de l'interface et
// permettre un minimum de fonctionnement hors-ligne (l'app reste utilisable
// pour consulter les dernières données affichées, pas pour du offline-first
// complet).

const CACHE_NAME = "fintrack-shell-v1";
const APP_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Réseau d'abord, cache en secours — pour une app de finances à jour,
  // mieux vaut privilégier les données fraîches et ne dépanner que si le
  // réseau est indisponible.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
