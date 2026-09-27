// lib/axios.js
//
// Instance axios partagée : withCredentials permet d'envoyer/recevoir le
// cookie httpOnly du backend malgré le fait que frontend et backend sont
// sur des domaines différents (Vercel vs Render).

import axios from "axios";

const BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5002/api"
    : process.env.NEXT_PUBLIC_API_URL;

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});
