// constants/categories.js
//
// Catégories de départ, copiées dans la base de données de chaque
// utilisateur au moment de son inscription (voir auth.controller.js).
// Une fois copiées, elles lui appartiennent complètement : ce fichier ne
// sert donc plus qu'à définir le point de départ pour un nouveau compte,
// pas à valider les transactions par la suite (voir models/category.model.js
// et controllers/category.controller.js pour la version modifiable).

const EXPENSE_CATEGORIES = [
  "Logement",
  "Alimentation",
  "Transport",
  "Santé",
  "Loisirs",
  "Shopping",
  "Factures & Abonnements",
  "Éducation",
  "Épargne",
  "Autre",
];

const INCOME_CATEGORIES = [
  "Salaire",
  "Freelance",
  "Cadeau",
  "Remboursement",
  "Investissement",
  "Autre",
];

// Classification par défaut des catégories de dépense pour le plan
// budgétaire 50/30/20 (voir budgetPlan.controller.js) — un simple point de
// départ raisonnable, que l'utilisateur peut changer librement ensuite
// (voir category.controller.js). "Autre" reste volontairement non classée :
// trop générique pour présumer d'un côté ou de l'autre.
const DEFAULT_BUDGET_TYPES = {
  Logement: "besoin",
  Alimentation: "besoin",
  Transport: "besoin",
  Santé: "besoin",
  "Factures & Abonnements": "besoin",
  Éducation: "besoin",
  Loisirs: "envie",
  Shopping: "envie",
  Épargne: "épargne",
};

// Icônes autorisées pour une catégorie. Ce sont des noms de composants
// lucide-react, résolus côté frontend (voir components/categoryIcons.ts) —
// la liste blanche évite qu'une valeur arbitraire arrive jusqu'à
// l'interface, où elle ne correspondrait à aucun composant.
const CATEGORY_ICONS = [
  "Tag",
  "House",
  "ShoppingCart",
  "ShoppingBag",
  "Car",
  "Fuel",
  "HeartPulse",
  "Film",
  "Gamepad2",
  "Music",
  "Receipt",
  "GraduationCap",
  "BookOpen",
  "PiggyBank",
  "Gift",
  "Briefcase",
  "TrendingUp",
  "Utensils",
  "Coffee",
  "Plane",
  "Smartphone",
  "PawPrint",
  "Wrench",
  "Dumbbell",
  "Shirt",
  "Baby",
  "Wallet",
  "Banknote",
];

const DEFAULT_CATEGORY_ICON = "Tag";
const DEFAULT_CATEGORY_COLOR = "#71717a";

// Style de départ (icône + couleur) des catégories par défaut, indexé par
// nom comme DEFAULT_BUDGET_TYPES ci-dessus. "Autre" apparaît côté dépense
// ET côté revenu : il partage donc le même style neutre dans les deux cas.
const DEFAULT_CATEGORY_STYLES = {
  Logement: { icon: "House", color: "#6366f1" },
  Alimentation: { icon: "Utensils", color: "#f97316" },
  Transport: { icon: "Car", color: "#0ea5e9" },
  Santé: { icon: "HeartPulse", color: "#ef4444" },
  Loisirs: { icon: "Gamepad2", color: "#a855f7" },
  Shopping: { icon: "ShoppingBag", color: "#ec4899" },
  "Factures & Abonnements": { icon: "Receipt", color: "#eab308" },
  Éducation: { icon: "GraduationCap", color: "#14b8a6" },
  Épargne: { icon: "PiggyBank", color: "#22c55e" },
  Autre: { icon: "Tag", color: "#71717a" },
  Salaire: { icon: "Banknote", color: "#22c55e" },
  Freelance: { icon: "Briefcase", color: "#0ea5e9" },
  Cadeau: { icon: "Gift", color: "#ec4899" },
  Remboursement: { icon: "Wallet", color: "#14b8a6" },
  Investissement: { icon: "TrendingUp", color: "#6366f1" },
};

module.exports = {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  DEFAULT_BUDGET_TYPES,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_ICON,
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_STYLES,
};
