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
  metadataBase: new URL("https://fintrack-frontend-beta.vercel.app"),
  title: {
    default: "FinTrack — Gérez vos finances",
    template: "%s · FinTrack",
  },
  description:
    "Suivez vos revenus et dépenses, comprenez où va votre argent, et avancez vers vos objectifs financiers.",
  applicationName: "FinTrack",
  keywords: [
    "gestion budget",
    "suivi des dépenses",
    "finances personnelles",
    "épargne",
    "budget en ligne",
  ],
  authors: [{ name: "Massinissa Haddad" }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "FinTrack",
    title: "FinTrack — Gérez vos finances",
    description:
      "Suivez vos revenus et dépenses, comprenez où va votre argent, et avancez vers vos objectifs financiers.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinTrack — Gérez vos finances",
    description:
      "Suivez vos revenus et dépenses, comprenez où va votre argent, et avancez vers vos objectifs financiers.",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={inter.variable}>
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
