// debt.logic.js
//
// Validation et calculs d'argent des dettes, isolés du contrôleur : aucun
// accès à la base de données ici, donc testables seuls. C'est l'endroit où
// les bugs se cachent (arrondis des nombres à virgule, sur-remboursement,
// retrait d'un paiement), d'où l'intérêt de pouvoir les vérifier à part.

const DIRECTIONS = ["owed_to_me", "i_owe"];
const MAX_AMOUNT = 1_000_000_000_000; // garde-fou contre une saisie absurde
const MAX_PERSON_LENGTH = 80;
const MAX_NOTE_LENGTH = 200;

// Arrondi à 2 décimales. Number.EPSILON évite que 1.005 devienne 1 au lieu
// de 1.01, et ça neutralise les artefacts de la virgule flottante
// (0.1 + 0.2 = 0.30000000000000004).
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const isMoney = (n) => typeof n === "number" && Number.isFinite(n);

// Reste à rembourser, jamais négatif
const remainingOf = (amount, paidAmount) => Math.max(0, round2(amount - paidAmount));

// Une date optionnelle : vide → null, valide → Date, invalide → undefined
function parseOptionalDate(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// Valide et normalise le corps d'une création de dette.
// Renvoie { error } ou { value }.
function validateNewDebt(body) {
  const { person, direction, amount, dueDate, note } = body || {};

  if (typeof person !== "string" || !person.trim()) {
    return { error: "Le nom de la personne est requis." };
  }
  if (person.trim().length > MAX_PERSON_LENGTH) {
    return { error: `Le nom est limité à ${MAX_PERSON_LENGTH} caractères.` };
  }
  if (!DIRECTIONS.includes(direction)) {
    return { error: "Indique si on te doit de l'argent ou si tu en dois." };
  }
  if (!isMoney(amount) || round2(amount) <= 0) {
    return { error: "Le montant doit être positif." };
  }
  if (amount > MAX_AMOUNT) {
    return { error: "Ce montant est trop élevé." };
  }

  const parsedDue = parseOptionalDate(dueDate);
  if (parsedDue === undefined) {
    return { error: "Date d'échéance invalide." };
  }

  if (note !== undefined && note !== null && typeof note !== "string") {
    return { error: "Note invalide." };
  }
  if (note && note.trim().length > MAX_NOTE_LENGTH) {
    return { error: `La note est limitée à ${MAX_NOTE_LENGTH} caractères.` };
  }

  return {
    value: {
      person: person.trim(),
      direction,
      amount: round2(amount),
      dueDate: parsedDue,
      note: note ? note.trim() : "",
    },
  };
}

// Valide un remboursement par rapport à ce qu'il reste dû.
// Renvoie { error, remaining? } ou { value } (le montant arrondi).
function validatePayment(amount, remaining) {
  if (!isMoney(amount) || round2(amount) <= 0) {
    return { error: "Le montant du remboursement doit être positif." };
  }
  const rounded = round2(amount);
  // Tolérance d'un demi-centime : un reste de 21.67 doit pouvoir être soldé
  // en saisissant 21.67, malgré les arrondis internes
  if (rounded > remaining + 0.005) {
    return { error: "Ce remboursement dépasse le reste dû.", remaining };
  }
  return { value: rounded };
}

// Total remboursé après avoir ajouté un paiement
const paidAfterAdding = (paidAmount, paymentAmount) => round2(paidAmount + paymentAmount);

// Total remboursé après avoir retiré un paiement (jamais négatif, même si
// des arrondis ont fait dériver paidAmount de quelques centimes)
const paidAfterRemoving = (paidAmount, paymentAmount) =>
  Math.max(0, round2(paidAmount - paymentAmount));

module.exports = {
  DIRECTIONS,
  round2,
  remainingOf,
  parseOptionalDate,
  validateNewDebt,
  validatePayment,
  paidAfterAdding,
  paidAfterRemoving,
};
