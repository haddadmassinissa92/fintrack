import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinTrack — Gérez vos finances",
    short_name: "FinTrack",
    description:
      "Suivez vos revenus et dépenses, comprenez où va votre argent, et avancez vers vos objectifs financiers.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f4f5",
    theme_color: "#059669",
    orientation: "portrait",
    // Menu qui s'ouvre en appui long sur l'icône de l'app (Android) ou
    // en clic droit sur son icône dans la barre des tâches (Chrome/Edge
    // sur ordinateur). Les URL sont gérées par le dashboard, qui ouvre
    // directement le formulaire d'ajout du bon type.
    shortcuts: [
      {
        name: "Ajouter une dépense",
        short_name: "Dépense",
        description: "Enregistrer une nouvelle dépense",
        url: "/dashboard?add=expense",
        icons: [{ src: "/icons/shortcut-expense.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Ajouter un revenu",
        short_name: "Revenu",
        description: "Enregistrer un nouveau revenu",
        url: "/dashboard?add=income",
        icons: [{ src: "/icons/shortcut-income.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
