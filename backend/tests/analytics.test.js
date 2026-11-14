const {
  buildMonthComparison,
  buildAnnualReport,
  percentChange,
  round2,
} = require("../analytics.service");

describe("analytics.service", () => {
  describe("percentChange", () => {
    it("calcule correctement les variations positives et négatives", () => {
      expect(percentChange(120, 100)).toBe(20);
      expect(percentChange(80, 100)).toBe(-20);
      expect(percentChange(100, 100)).toBe(0);
    });

    it("gère les divisions par zéro", () => {
      expect(percentChange(100, 0)).toBeNull();
      expect(percentChange(0, 0)).toBe(0);
    });
  });

  describe("buildMonthComparison", () => {
    it("compare correctement les dépenses et revenus entre M et M-1", () => {
      const currentExpenses = { Alimentation: 300, Transport: 150 };
      const currentIncomes = { Salaire: 2000 };
      const prevExpenses = { Alimentation: 250, Loisirs: 100 };
      const prevIncomes = { Salaire: 2000 };

      const result = buildMonthComparison({
        currentExpenses,
        currentIncomes,
        prevExpenses,
        prevIncomes,
      });

      expect(result.totals.current.expense).toBe(450);
      expect(result.totals.previous.expense).toBe(350);
      expect(result.totals.current.income).toBe(2000);
      expect(result.totals.current.balance).toBe(1550);

      // Catégories
      expect(result.categoryComparison).toHaveLength(3); // Alimentation, Transport, Loisirs

      const alim = result.categoryComparison.find((c) => c.category === "Alimentation");
      expect(alim.current).toBe(300);
      expect(alim.previous).toBe(250);
      expect(alim.diff).toBe(50);
      expect(alim.status).toBe("hausse");

      const transport = result.categoryComparison.find((c) => c.category === "Transport");
      expect(transport.diff).toBe(150);
      expect(result.highestIncrease.category).toBe("Transport");

      const loisirs = result.categoryComparison.find((c) => c.category === "Loisirs");
      expect(loisirs.diff).toBe(-100);
      expect(loisirs.status).toBe("baisse");
      expect(result.highestSaving.category).toBe("Loisirs");
    });
  });

  describe("buildAnnualReport", () => {
    it("calcule les métriques annuelles, le meilleur mois et les tops", () => {
      const year = 2026;
      const transactions = [
        // Janvier
        { type: "revenu", amount: 3000, category: "Salaire", date: "2026-01-05" },
        { type: "dépense", amount: 500, category: "Alimentation", title: "Courses", date: "2026-01-10" },
        { type: "dépense", amount: 1200, category: "Logement", title: "Loyer Janvier", date: "2026-01-01" },
        // Février
        { type: "revenu", amount: 3000, category: "Salaire", date: "2026-02-05" },
        { type: "dépense", amount: 400, category: "Alimentation", title: "Courses Février", date: "2026-02-10" },
        { type: "dépense", amount: 800, category: "Loisirs", title: "Voyage", date: "2026-02-15" },
        // Virement interne (doit être ignoré)
        { type: "transfert", amount: 500, category: "Virement", date: "2026-02-18" },
      ];

      const report = buildAnnualReport({ year, transactions });

      expect(report.year).toBe(2026);
      expect(report.summary.totalIncome).toBe(6000);
      expect(report.summary.totalExpense).toBe(2900);
      expect(report.summary.netSavings).toBe(3100);
      expect(report.summary.activeMonthsCount).toBe(2);

      // Meilleur mois (Janvier: 3000 - 1700 = 1300 épargné = 43.33% ; Février: 3000 - 1200 = 1800 épargné = 60%)
      expect(report.highlights.bestMonth.name).toBe("Février");
      expect(report.highlights.heaviestMonth.name).toBe("Janvier");

      // Top dépenses
      expect(report.topExpenses[0].title).toBe("Loyer Janvier");
      expect(report.topExpenses[0].amount).toBe(1200);

      // Top catégories
      expect(report.topCategories[0].category).toBe("Logement");
      expect(report.topCategories[0].amount).toBe(1200);

      // Découpage mensuel sur 12 mois
      expect(report.monthlyBreakdown).toHaveLength(12);
      expect(report.monthlyBreakdown[0].income).toBe(3000);
      expect(report.monthlyBreakdown[0].expense).toBe(1700);
      expect(report.monthlyBreakdown[1].income).toBe(3000);
      expect(report.monthlyBreakdown[1].expense).toBe(1200);
    });
  });
});
