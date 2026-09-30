"use client";

import { useEffect } from "react";

// Enregistre le service worker une fois la page chargée. Séparé en
// composant client à part parce que layout.tsx exporte des métadonnées
// (export const metadata), ce qui impose que ce soit un composant serveur —
// or l'enregistrement d'un service worker n'est possible que côté client.
export default function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Échec silencieux : si l'enregistrement rate (navigateur non
        // supporté, mode navigation privée strict...), l'app continue de
        // fonctionner normalement, simplement sans installabilité PWA.
      });
    }
  }, []);

  return null;
}
