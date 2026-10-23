// lib/axios.js
//
// Instance axios partagée. baseURL relative ("/api") : Next.js redirige
// ces requêtes vers le backend Render côté serveur (voir next.config.ts).
// Pour le navigateur, tout reste sur le même domaine que le site — le
// cookie httpOnly du backend est donc traité comme un cookie de première
// partie, et n'est plus bloqué par les protections anti cookies tiers de
// Chrome/Safari (ce qui arrivait quand on appelait directement le domaine
// Render depuis Vercel).

import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// --- Compte partagé consulté -------------------------------------------
//
// Quand l'utilisateur consulte le compte d'une autre personne (voir
// useAccountStore.js), l'identifiant de ce propriétaire est gardé dans
// localStorage et joint à chaque requête. Le serveur ne s'y fie jamais : il
// revérifie à chaque fois, en base, que le partage existe encore (voir
// backend/middlewares/protectDataRoute.js).
export const ACTIVE_ACCOUNT_KEY = "activeAccountOwner";

const AUTH_SESSION_URL = /^\/auth\/(login|signup|logout)$/;

axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const owner = window.localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    if (owner) config.headers["X-Account-Owner"] = owner;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    // Une nouvelle session (connexion, inscription) ou la fin de la session
    // ne doit jamais hériter du compte partagé consulté auparavant
    if (typeof window !== "undefined" && AUTH_SESSION_URL.test(response.config.url || "")) {
      window.localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    }
    return response;
  },
  (error) => {
    // Accès retiré (ou compte supprimé) pendant la consultation : on
    // revient au compte personnel plutôt que de laisser un écran cassé
    if (
      typeof window !== "undefined" &&
      error.response?.status === 403 &&
      error.response?.data?.code === "ACCOUNT_ACCESS_DENIED"
    ) {
      window.localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
      window.location.reload();
    }
    return Promise.reject(error);
  },
);
