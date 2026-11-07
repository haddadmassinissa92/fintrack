// lib/categorizer.ts
// Moteur intelligent de prédiction et catégorisation automatique pour FinTrack

type CategoryRule = {
  keywords: string[];
  categoryNames: string[]; // Variations possibles de la catégorie
  defaultType: "dépense" | "revenu";
};

const CATEGORY_RULES: CategoryRule[] = [
  // Alimentation & Supermarché
  {
    keywords: [
      "carrefour", "lidl", "auchan", "leclerc", "monoprix", "franprix", "intermarche",
      "intermarché", "boulangerie", "supermarche", "supermarché", "courses", "biocoop",
      "boucherie", "primeur", "aldi", "picard", "marche", "marché", "alimentation",
      "casino", "cora", "grand frais"
    ],
    categoryNames: ["Alimentation", "Courses", "Supermarché", "Nourriture"],
    defaultType: "dépense",
  },
  // Restaurants & Sorties
  {
    keywords: [
      "restaurant", "resto", "mcdonalds", "mcdo", "burger king", "kfc", "starbucks",
      "cafe", "café", "bar", "brasserie", "pizzeria", "sushi", "deliveroo", "uber eats",
      "just eat", "bistro", "pub", "sandwich", "creperie", "crêperie", "food"
    ],
    categoryNames: ["Restaurants", "Sorties", "Alimentation", "Loisirs"],
    defaultType: "dépense",
  },
  // Transport & Carburant
  {
    keywords: [
      "uber", "bolt", "taxi", "sncf", "train", "ratp", "metro", "métro", "bus", "tram",
      "navigo", "total", "bp", "esso", "shell", "essence", "carburant", "station",
      "peage", "péage", "parking", "vinci", "tgv", "ter", "blablacar", "avion", "air france",
      "easyjet", "ryanair", "trottinette", "lime", "dott", "velib"
    ],
    categoryNames: ["Transport", "Transports", "Carburant", "Véhicule"],
    defaultType: "dépense",
  },
  // Logement, Factures & Charges
  {
    keywords: [
      "loyer", "edf", "engie", "electricite", "électricité", "eau", "veolia", "totalenergies",
      "orange", "sfr", "bouygues", "free", "internet", "gaz", "charges", "copropriete",
      "copropriété", "assurance habitation", "syndic"
    ],
    categoryNames: ["Logement", "Factures", "Charges", "Services"],
    defaultType: "dépense",
  },
  // Abonnements & Streaming
  {
    keywords: [
      "netflix", "spotify", "youtube", "amazon prime", "prime video", "disney", "deezer",
      "apple", "canal+", "canal plus", "salle de sport", "basic fit", "fitness park",
      "fitness", "cinema", "cinéma", "ugc", "pathe", "pathé", "icloud", "chatgpt",
      "playstation", "xbox", "game pass", "nintendo"
    ],
    categoryNames: ["Abonnements", "Loisirs", "Divertissement", "Services"],
    defaultType: "dépense",
  },
  // Santé
  {
    keywords: [
      "pharmacie", "medecin", "médecin", "docteur", "dentiste", "doctolib", "mutuelle",
      "kine", "kiné", "opticien", "hopital", "hôpital", "clinique", "laboratoire",
      "ophtalmo", "analyse", "soins", "sante", "santé"
    ],
    categoryNames: ["Santé", "Médical", "Soins"],
    defaultType: "dépense",
  },
  // Shopping & Vêtements & Maison
  {
    keywords: [
      "zara", "h&m", "fnac", "amazon", "darty", "ikea", "leroy merlin", "castorama",
      "decathlon", "décathlon", "sephora", "celio", "uniqlo", "boulanger", "action",
      "vinted", "shein", "vetements", "vêtements", "chaussures", "meuble", "bricolage"
    ],
    categoryNames: ["Shopping", "Vêtements", "Achats", "Maison", "Loisirs"],
    defaultType: "dépense",
  },
  // Revenus & Salaire
  {
    keywords: [
      "salaire", "paie", "virement employeur", "caf", "securite sociale", "sécurité sociale",
      "cpam", "remboursement", "prime", "dividendes", "freelance", "client", "pension",
      "bourse", "allocation", "vente", "revenu"
    ],
    categoryNames: ["Salaire", "Revenus", "Revenu", "Virement", "Autre"],
    defaultType: "revenu",
  },
  // Épargne & Investissements
  {
    keywords: [
      "epargne", "épargne", "livret", "bourse", "etf", "crypto", "bitcoin", "binance",
      "trade republic", "placement", "assurance vie"
    ],
    categoryNames: ["Épargne", "Investissement", "Virement"],
    defaultType: "dépense",
  },
];

export type PredictionResult = {
  category: string;
  suggestedType?: "dépense" | "revenu";
  confidence: "high" | "medium";
  reason: string;
};

/**
 * Prédit intelligemment la catégorie et le type à partir du texte saisi.
 * Priorise l'historique personnel de l'utilisateur, puis applique les règles sémantiques.
 */
export function predictCategory(
  text: string,
  availableCategories: string[],
  pastTransactions: Array<{ description?: string; category: string; type?: string }> = []
): PredictionResult | null {
  if (!text || text.trim().length < 2) return null;

  const normalizedInput = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  // 1. Apprentissage basé sur l'historique de l'utilisateur (confiance élevée)
  if (pastTransactions.length > 0) {
    for (const tx of pastTransactions) {
      if (!tx.description) continue;
      const normalizedDesc = tx.description
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

      if (
        (normalizedDesc.length >= 3 && normalizedInput.includes(normalizedDesc)) ||
        (normalizedInput.length >= 3 && normalizedDesc.includes(normalizedInput))
      ) {
        // Vérifier si cette catégorie existe toujours dans les catégories actuelles
        const matchingCategory = availableCategories.find(
          (c) => c.toLowerCase() === tx.category.toLowerCase()
        );
        if (matchingCategory) {
          return {
            category: matchingCategory,
            suggestedType: tx.type === "revenu" ? "revenu" : "dépense",
            confidence: "high",
            reason: "Basé sur vos transactions précédentes",
          };
        }
      }
    }
  }

  // 2. Règles sémantiques intelligentes
  const words = normalizedInput.split(/[\s,.-]+/);

  for (const rule of CATEGORY_RULES) {
    const hasKeyword = rule.keywords.some((kw) => {
      const normalizedKw = kw
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      // Correspondance par mot entier ou sous-chaîne significative
      return words.includes(normalizedKw) || normalizedInput.includes(normalizedKw);
    });

    if (hasKeyword) {
      // Trouver la catégorie correspondante parmi celles disponibles pour l'utilisateur
      for (const targetName of rule.categoryNames) {
        const found = availableCategories.find(
          (c) =>
            c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ===
            targetName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        );
        if (found) {
          return {
            category: found,
            suggestedType: rule.defaultType,
            confidence: "medium",
            reason: "Détecté automatiquement",
          };
        }
      }

      // Si aucune correspondance exacte de nom de catégorie, vérifier s'il existe une catégorie contenant le mot clé
      const partialFound = availableCategories.find((c) => {
        const norm = c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return rule.categoryNames.some((tn) =>
          norm.includes(tn.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
        );
      });

      if (partialFound) {
        return {
          category: partialFound,
          suggestedType: rule.defaultType,
          confidence: "medium",
          reason: "Détecté automatiquement",
        };
      }
    }
  }

  return null;
}
