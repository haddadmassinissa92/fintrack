// lib/theme.js
//
// Gère la préférence clair/sombre : lue depuis localStorage au chargement
// (pour rester cohérente d'une visite à l'autre), et basculée en ajoutant/
// retirant la classe "dark" sur <html>, que Tailwind utilise pour activer
// les styles dark: (voir le @custom-variant dans globals.css).

export function getInitialTheme() {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("theme");
  return stored === "dark";
}

export function applyTheme(isDark) {
  document.documentElement.classList.toggle("dark", isDark);
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  return isDark;
}
