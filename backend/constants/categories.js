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

module.exports = { EXPENSE_CATEGORIES, INCOME_CATEGORIES, DEFAULT_BUDGET_TYPES };
