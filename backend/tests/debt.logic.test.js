const {
  round2,
  remainingOf,
  validateNewDebt,
  validatePayment,
  paidAfterAdding,
  paidAfterRemoving,
} = require("../debt.logic");

const validDebt = {
  person: "Karim",
  direction: "owed_to_me",
  amount: 10000,
  dueDate: "2026-11-30",
  note: "prêt",
};

describe("calculs d'argent", () => {
  it("neutralise les artefacts de la virgule flottante", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
  });

  it("calcule le reste dû, jamais négatif", () => {
    expect(remainingOf(10000, 4000)).toBe(6000);
    expect(remainingOf(100, 100.004)).toBe(0);
  });

  it("solde exactement une dette payée en plusieurs fois (3 × 33,33 + 0,01 = 100)", () => {
    let paid = 0;
    for (const p of [33.33, 33.33, 33.33, 0.01]) paid = paidAfterAdding(paid, p);
    expect(paid).toBe(100);
    expect(remainingOf(100, paid)).toBe(0);
  });

  it("ne descend jamais sous zéro en retirant un paiement", () => {
    expect(paidAfterRemoving(6000, 2000)).toBe(4000);
    expect(paidAfterRemoving(10.0, 10.01)).toBe(0);
  });
});

describe("validatePayment", () => {
  it("accepte de solder exactement le reste", () => {
    expect(validatePayment(21.67, 21.67).value).toBe(21.67);
  });

  it("refuse de dépasser le reste dû, et renvoie ce reste", () => {
    const result = validatePayment(7000, 6000);
    expect(result.error === undefined).toBe(false);
    expect(result.remaining).toBe(6000);
  });

  it("refuse un centime de trop", () => {
    expect(validatePayment(21.68, 21.67).error === undefined).toBe(false);
  });

  it("refuse les montants nuls, négatifs, non numériques ou infinis", () => {
    for (const bad of [0, -5, NaN, Infinity, "50", 0.001]) {
      expect(validatePayment(bad, 100).error === undefined).toBe(false);
    }
  });
});

describe("validateNewDebt", () => {
  it("accepte une dette valide et nettoie les champs", () => {
    const { value } = validateNewDebt({ ...validDebt, person: "  Karim  ", note: " prêt " });
    expect(value.person).toBe("Karim");
    expect(value.note).toBe("prêt");
    expect(value.amount).toBe(10000);
  });

  it("accepte les deux sens", () => {
    expect(validateNewDebt({ ...validDebt, direction: "i_owe" }).error === undefined).toBe(true);
  });

  it("traite une échéance absente ou vide comme « sans échéance »", () => {
    expect(validateNewDebt({ ...validDebt, dueDate: "" }).value.dueDate).toBe(null);
    expect(validateNewDebt({ ...validDebt, dueDate: undefined }).value.dueDate).toBe(null);
  });

  it("refuse une échéance invalide", () => {
    expect(validateNewDebt({ ...validDebt, dueDate: "pas-une-date" }).error === undefined).toBe(
      false,
    );
  });

  it("refuse un nom vide, absent ou trop long", () => {
    for (const person of ["   ", undefined, "x".repeat(81)]) {
      expect(validateNewDebt({ ...validDebt, person }).error === undefined).toBe(false);
    }
  });

  it("refuse un sens inconnu ou absent", () => {
    for (const direction of ["autre", undefined]) {
      expect(validateNewDebt({ ...validDebt, direction }).error === undefined).toBe(false);
    }
  });

  it("refuse les montants invalides ou absurdes", () => {
    for (const amount of [0, -100, "100", 1e15, NaN]) {
      expect(validateNewDebt({ ...validDebt, amount }).error === undefined).toBe(false);
    }
  });

  it("arrondit le montant à 2 décimales", () => {
    expect(validateNewDebt({ ...validDebt, amount: 10.456 }).value.amount).toBe(10.46);
  });

  it("refuse une note trop longue ou non textuelle", () => {
    for (const note of ["x".repeat(201), 123]) {
      expect(validateNewDebt({ ...validDebt, note }).error === undefined).toBe(false);
    }
  });

  it("ne plante pas sans corps de requête", () => {
    expect(validateNewDebt(undefined).error === undefined).toBe(false);
    expect(validateNewDebt(null).error === undefined).toBe(false);
  });
});
