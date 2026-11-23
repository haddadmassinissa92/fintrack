// public/sw.js  — FinTrack Service Worker v3
// Offline-first PWA :
//   • Cache réseau de l'interface (app shell)
//   • File d'attente persistante (IndexedDB) des transactions créées hors-ligne
//   • Background Sync pour les rejouer dès que le réseau revient
//   • Push notifications pour les alertes budget

// ─── Versionnage du cache ────────────────────────────────────────────────────
const CACHE_NAME = "fintrack-shell-v3";
const APP_SHELL = ["/", "/manifest.webmanifest"];
const OFFLINE_DB_NAME = "fintrack-offline";
const OFFLINE_STORE   = "pending-transactions";
const SYNC_TAG        = "fintrack-sync-transactions";

// ─── Helpers IndexedDB (promise-based) ─────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(OFFLINE_STORE, {
        keyPath: "localId",
        autoIncrement: true,
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function dbGetAll(db) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(OFFLINE_STORE, "readonly");
    const req = tx.objectStore(OFFLINE_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function dbDelete(db, key) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(OFFLINE_STORE, "readwrite");
    const req = tx.objectStore(OFFLINE_STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

function dbAdd(db, data) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(OFFLINE_STORE, "readwrite");
    const req = tx.objectStore(OFFLINE_STORE).add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ─── INSTALL : mise en cache de l'app shell ─────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ─── ACTIVATE : nettoyage des anciens caches ────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

// ─── FETCH : stratégie Network-first pour l'UI, interception des POST /api ──
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ── Interception des POST /api/transactions (création hors-ligne) ──────
  if (
    request.method === "POST" &&
    url.pathname.startsWith("/api/transactions") &&
    !url.pathname.startsWith("/api/transactions/import")
  ) {
    event.respondWith(handleOfflinePost(request));
    return;
  }

  // ── On n'intercepte PAS les autres méthodes non-GET (PUT, DELETE, PATCH)
  if (request.method !== "GET") return;

  // ── Les requêtes API GET : network-only (données toujours fraîches) ────
  if (url.pathname.startsWith("/api/")) return;

  // ── Interface / pages Next.js : Network-first, fallback cache ──────────
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return (
          cached ??
          new Response(
            `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FinTrack — Hors ligne</title>
<style>
  body { font-family: system-ui, sans-serif; display: flex; align-items: center;
         justify-content: center; min-height: 100vh; margin: 0;
         background: #18181b; color: #fff; }
  .box { text-align: center; padding: 2rem; }
  .icon { font-size: 3rem; margin-bottom: 1rem; }
  h1 { font-size: 1.5rem; margin: 0 0 .5rem; }
  p  { color: #a1a1aa; margin: 0 0 1.5rem; }
  button { background: #059669; color: #fff; border: none; border-radius: 8px;
           padding: .6rem 1.4rem; font-size: .9rem; cursor: pointer; }
</style></head>
<body>
  <div class="box">
    <div class="icon">📡</div>
    <h1>Vous êtes hors ligne</h1>
    <p>Reconnectez-vous au réseau pour accéder à FinTrack.<br>
       Vos transactions saisies hors connexion seront synchronisées automatiquement.</p>
    <button onclick="location.reload()">Réessayer</button>
  </div>
</body></html>`,
            {
              status: 200,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }
          )
        );
      })
  );
});

// ─── Gestion des POST hors-ligne ────────────────────────────────────────────
async function handleOfflinePost(request) {
  try {
    // Online : on tente directement l'appel réseau
    const response = await fetch(request.clone());
    return response;
  } catch {
    // Offline : on sauvegarde la transaction dans IndexedDB
    try {
      const body = await request.clone().json();
      const db   = await openDB();
      await dbAdd(db, {
        url:        request.url,
        body,
        timestamp:  Date.now(),
      });

      // Enregistrement d'un Background Sync si l'API est disponible
      if (self.registration.sync) {
        await self.registration.sync.register(SYNC_TAG);
      }

      // Notifier les onglets ouverts de la mise en file d'attente
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.postMessage({ type: "TRANSACTION_QUEUED", payload: body });
      }

      // Réponse 202 Accepted — la transaction sera synchronisée plus tard
      return new Response(
        JSON.stringify({
          queued: true,
          message:
            "Transaction sauvegardée hors ligne. Elle sera synchronisée automatiquement dès le retour du réseau.",
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (dbError) {
      return new Response(
        JSON.stringify({ message: "Impossible de sauvegarder hors ligne." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
}

// ─── BACKGROUND SYNC : rejoue la file d'attente au retour du réseau ─────────
self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncPendingTransactions());
  }
});

async function syncPendingTransactions() {
  const db      = await openDB();
  const pending = await dbGetAll(db);

  if (pending.length === 0) return;

  let syncedCount = 0;

  for (const item of pending) {
    try {
      const response = await fetch(item.url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(item.body),
        credentials: "include",
      });

      if (response.ok) {
        await dbDelete(db, item.localId);
        syncedCount++;
      }
      // Si le serveur renvoie une erreur client (400, 401…), on supprime
      // quand même l'entrée pour ne pas rejouer indéfiniment une requête
      // invalide (ex: session expirée). L'utilisateur devra se reconnecter.
      if (response.status >= 400 && response.status < 500) {
        await dbDelete(db, item.localId);
      }
    } catch {
      // Réseau toujours indisponible : on garde l'entrée pour le prochain cycle
    }
  }

  if (syncedCount > 0) {
    // Notifier les onglets que la sync est terminée → le frontend recharge les données
    const clients = await self.clients.matchAll({ type: "window" });
    for (const client of clients) {
      client.postMessage({
        type:  "SYNC_COMPLETED",
        count: syncedCount,
      });
    }

    // Afficher une notification si l'app est en arrière-plan
    const allClients = await self.clients.matchAll({ includeUncontrolled: true });
    const isHidden   = allClients.every((c) => c.visibilityState === "hidden" || !c.focused);
    if (isHidden) {
      await self.registration.showNotification("FinTrack — Synchronisation", {
        body: `${syncedCount} transaction${syncedCount > 1 ? "s" : ""} synchronisée${syncedCount > 1 ? "s" : ""} avec succès.`,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: "/dashboard" },
      });
    }
  }
}

// ─── PUSH NOTIFICATIONS ──────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "FinTrack", body: "", url: "/dashboard" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // payload non-JSON — on garde les valeurs par défaut
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data:  { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
