const { buildInsights } = require("../insights.service");

// Trois mois précédents identiques : 40 000 de dépenses au total
const stable = { Logement: 20000, Alimentation: 12000, Loisirs: 8000 };
const history = [stable, stable, stable];

function run(overrides) {
  return buildInsights({
    currentExpenseByCategory: stable,
    currentIncome: 0,
    previousExpenseByCategory: history,
    comparable: true,
    ...overrides,
  });
}

describe("buildInsights", () => {
  it("détecte une catégorie qui explose (+50 %)", () => {
    const { insights } = run({
      currentExpenseByCategory: { Logement: 20000, Alimentation: 18000, Loisirs: 8000 },
    });
    const spike = insights.find((i) => i.type === "category_spike");
    expect(spike.category).toBe("Alimentation");
    expect(spike.percent).toBe(50);
  });

  it("détecte la hausse globale des dépenses (46 000 vs 40 000 = +15 %)", () => {
    const { insights } = run({
      currentExpenseByCategory: { Logement: 20000, Alimentation: 18000, Loisirs: 8000 },
    });
    const overall = insights.find((i) => i.type === "overall");
    expect(overall.direction).toBe("up");
    expect(overall.percent).toBe(15);
  });

  it("signale une catégorie nettement en baisse", () => {
    const { insights } = run({
      currentExpenseByCategory: { Logement: 20000, Alimentation: 12000, Loisirs: 2000 },
    });
    const drop = insights.find((i) => i.type === "category_drop");
    expect(drop.category).toBe("Loisirs");
    expect(drop.percent).toBe(75);
  });

  it("ignore une variation sans poids réel dans le budget (Café 300 → 600)", () => {
    const withCafe = { ...stable, Café: 300 };
    const { insights } = run({
      currentExpenseByCategory: { ...stable, Café: 600 },
      previousExpenseByCategory: [withCafe, withCafe, withCafe],
    });
    expect(insights.some((i) => i.category === "Café")).toBe(false);
  });

  it("ne compare pas quand la période est trop courte, mais garde le taux d'épargne", () => {
    const { insights } = run({
      currentExpenseByCategory: { Alimentation: 5000 },
      currentIncome: 50000,
      comparable: false,
    });
    expect(insights).toHaveLength(1);
    expect(insights[0].type).toBe("savings_rate");
    expect(insights[0].rate).toBe(90);
  });

  it("sans historique, ne compare rien", () => {
    const { insights, comparedMonths } = run({
      currentExpenseByCategory: { Alimentation: 5000 },
      currentIncome: 20000,
      previousExpenseByCategory: [{}, {}, {}],
    });
    expect(comparedMonths).toBe(0);
    expect(insights).toHaveLength(1);
  });

  it("ne dilue pas la moyenne avec des mois sans données (1 mois d'historique)", () => {
    const { insights, comparedMonths } = run({
      currentExpenseByCategory: { Logement: 20000, Alimentation: 18000, Loisirs: 8000 },
      previousExpenseByCategory: [stable, {}, {}],
    });
    expect(comparedMonths).toBe(1);
    // +50 %, et non +350 % comme si on avait divisé par 3 mois
    expect(insights.find((i) => i.type === "category_spike").percent).toBe(50);
  });

  it("signale des dépenses supérieures aux revenus par un taux négatif", () => {
    const { insights } = run({
      currentExpenseByCategory: { Logement: 30000 },
      currentIncome: 20000,
      previousExpenseByCategory: [{}, {}, {}],
    });
    expect(insights[0].rate).toBe(-50);
  });

  it("n'échoue pas sans revenus (pas de division par zéro)", () => {
    const { insights } = run({
      currentExpenseByCategory: { Logement: 30000 },
      currentIncome: 0,
      previousExpenseByCategory: [{}, {}, {}],
    });
    expect(insights).toHaveLength(0);
  });

  it("n'annonce pas une « baisse de 100 % » quand rien n'a encore été dépensé", () => {
    const { insights } = run({ currentExpenseByCategory: {} });
    expect(insights.some((i) => i.type === "overall")).toBe(false);
  });

  it("ne renvoie jamais plus de 2 catégories en hausse", () => {
    const many = { A: 10000, B: 10000, C: 10000, D: 10000 };
    const { insights } = run({
      currentExpenseByCategory: { A: 20000, B: 20000, C: 20000, D: 20000 },
      previousExpenseByCategory: [many, many, many],
    });
    expect(insights.filter((i) => i.type === "category_spike")).toHaveLength(2);
  });
});
