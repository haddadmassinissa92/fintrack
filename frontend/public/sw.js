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
  const { request } = event;

  // Ne jamais intercepter les requêtes non-GET (connexion, création de
  // transaction, etc.) : elles doivent toujours atteindre directement le
  // serveur, sans passer par cette logique de cache/secours.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Les appels à l'API ne sont jamais mis en cache : les données
  // financières doivent toujours être fraîches, jamais une version
  // périmée servie hors-ligne.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        // Toujours renvoyer une vraie Response, jamais `undefined` —
        // sinon le navigateur lève une erreur ("Failed to convert value
        // to 'Response'") au lieu d'afficher une page de secours.
        return (
          cached ??
          new Response("Hors ligne", {
            status: 503,
            statusText: "Service indisponible hors ligne",
          })
        );
      }),
  );
});
