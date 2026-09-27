import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Police Google chargée localement par Next.js (pas de requête externe au
// chargement de la page, tout est intégré au build) — bien plus soignée
// que la police système par défaut
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FinTrack — Gérez vos finances",
  description: "Suivez vos revenus et dépenses, comprenez où va votre argent, et avancez vers vos objectifs financiers.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Applique le thème sauvegardé avant le premier rendu, pour
            éviter un flash de thème clair puis sombre au chargement */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('theme') === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
