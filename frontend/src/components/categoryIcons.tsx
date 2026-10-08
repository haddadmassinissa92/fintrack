import {
  Tag,
  House,
  ShoppingCart,
  ShoppingBag,
  Car,
  Fuel,
  HeartPulse,
  Film,
  Gamepad2,
  Music,
  Receipt,
  GraduationCap,
  BookOpen,
  PiggyBank,
  Gift,
  Briefcase,
  TrendingUp,
  Utensils,
  Coffee,
  Plane,
  Smartphone,
  PawPrint,
  Wrench,
  Dumbbell,
  Shirt,
  Baby,
  Wallet,
  Banknote,
  type LucideIcon,
} from "lucide-react";

// Doit rester synchronisé avec CATEGORY_ICONS dans
// backend/constants/categories.js : le backend n'accepte que ces noms.
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Tag,
  House,
  ShoppingCart,
  ShoppingBag,
  Car,
  Fuel,
  HeartPulse,
  Film,
  Gamepad2,
  Music,
  Receipt,
  GraduationCap,
  BookOpen,
  PiggyBank,
  Gift,
  Briefcase,
  TrendingUp,
  Utensils,
  Coffee,
  Plane,
  Smartphone,
  PawPrint,
  Wrench,
  Dumbbell,
  Shirt,
  Baby,
  Wallet,
  Banknote,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICON_MAP);

// Palette proposée dans le sélecteur de couleur — suffisamment variée pour
// distinguer les catégories sur un graphique, sans demander à l'utilisateur
// de manipuler un sélecteur de couleur libre.
export const CATEGORY_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#71717a",
];

export const DEFAULT_ICON = "Tag";
export const DEFAULT_COLOR = "#71717a";

// Affiche l'icône d'une catégorie dans une pastille teintée de sa couleur.
// Retombe sur l'icône générique si le nom n'est pas reconnu (par ex. une
// icône ajoutée plus tard côté backend mais pas encore ici).
export function CategoryIcon({
  icon,
  color,
  size = 18,
}: {
  icon?: string;
  color?: string;
  size?: number;
}) {
  const Icon = CATEGORY_ICON_MAP[icon || DEFAULT_ICON] || Tag;
  const tint = color || DEFAULT_COLOR;

  return (
    <span
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        width: size * 2,
        height: size * 2,
        backgroundColor: `${tint}26`, // la couleur à ~15% d'opacité (hex alpha)
        color: tint,
      }}
    >
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}
