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
