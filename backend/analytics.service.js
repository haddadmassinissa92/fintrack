// analytics.service.js
//
// Service de calcul des analyses et rapports avancés :
// 1. Comparateur Mois par Mois (M vs M-1 par catégorie)
// 2. Bilan Annuel Récapitulatif ("FinTrack Wrapped")

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

function percentChange(current, previous) {
  if (!previous || previous === 0) return current === 0 ? 0 : null;
  return round2(((current - previous) / previous) * 100);
}

/**
 * Construit la comparaison détaillée entre le mois en cours et le mois précédent.
 *
 * @param {Object} params
 * @param {Record<string, number>} params.currentExpenses - Dépenses par catégorie du mois M
 * @param {Record<string, number>} params.currentIncomes - Revenus par catégorie du mois M
 * @param {Record<string, number>} params.prevExpenses - Dépenses par catégorie du mois M-1
 * @param {Record<string, number>} params.prevIncomes - Revenus par catégorie du mois M-1
 */
function buildMonthComparison({
  currentExpenses = {},
  currentIncomes = {},
  prevExpenses = {},
  prevIncomes = {},
}) {
  const sumValues = (obj) => Object.values(obj).reduce((s, v) => s + (Number(v) || 0), 0);

  const curTotalExpense = round2(sumValues(currentExpenses));
  const curTotalIncome = round2(sumValues(currentIncomes));
  const prevTotalExpense = round2(sumValues(prevExpenses));
  const prevTotalIncome = round2(sumValues(prevIncomes));

  const curBalance = round2(curTotalIncome - curTotalExpense);
  const prevBalance = round2(prevTotalIncome - prevTotalExpense);

  const curSavingsRate =
    curTotalIncome > 0 ? round2(((curTotalIncome - curTotalExpense) / curTotalIncome) * 100) : 0;
  const prevSavingsRate =
    prevTotalIncome > 0 ? round2(((prevTotalIncome - prevTotalExpense) / prevTotalIncome) * 100) : 0;

  // Catégories de dépenses uniques combinées
  const allExpenseCats = Array.from(
    new Set([...Object.keys(currentExpenses), ...Object.keys(prevExpenses)])
  );

  const categoryComparison = allExpenseCats.map((category) => {
    const cur = round2(currentExpenses[category] || 0);
    const prev = round2(prevExpenses[category] || 0);
    const diff = round2(cur - prev);
    const change = percentChange(cur, prev);

    let status = "stable";
    if (diff > 0.5) status = "hausse";
    else if (diff < -0.5) status = "baisse";

    return {
      category,
      current: cur,
      previous: prev,
      diff,
      change,
      status,
    };
  });

  // Trier par montant actuel décroissant
  categoryComparison.sort((a, b) => b.current - a.current);

  // Trouver la plus forte hausse et la plus forte baisse
  let highestIncrease = null;
  let highestSaving = null;

  for (const item of categoryComparison) {
    if (item.diff > 0) {
      if (!highestIncrease || item.diff > highestIncrease.diff) {
        highestIncrease = item;
      }
    } else if (item.diff < 0) {
      if (!highestSaving || item.diff < highestSaving.diff) {
        highestSaving = item;
      }
    }
  }

  return {
    totals: {
      current: {
        income: curTotalIncome,
        expense: curTotalExpense,
        balance: curBalance,
        savingsRate: curSavingsRate,
      },
      previous: {
        income: prevTotalIncome,
        expense: prevTotalExpense,
        balance: prevBalance,
        savingsRate: prevSavingsRate,
      },
      evolution: {
        income: percentChange(curTotalIncome, prevTotalIncome),
        expense: percentChange(curTotalExpense, prevTotalExpense),
        balance: percentChange(curBalance, prevBalance),
        savingsRateDiff: round2(curSavingsRate - prevSavingsRate),
      },
    },
    categoryComparison,
    highestIncrease,
    highestSaving,
  };
}

/**
 * Construit le bilan annuel récapitulatif complet ("FinTrack Wrapped").
 *
 * @param {Object} params
 * @param {number} params.year - L'année analysée
 * @param {Array<Object>} params.transactions - Liste des transactions de l'année
 */
function buildAnnualReport({ year, transactions = [] }) {
  // 12 mois initialisés
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    name: MONTH_NAMES[i],
    shortName: MONTH_NAMES[i].slice(0, 4),
    income: 0,
    expense: 0,
    balance: 0,
    savingsRate: 0,
    transactionCount: 0,
  }));

  const categoryTotals = {};
  const singleExpenses = [];

  let totalIncome = 0;
  let totalExpense = 0;

  for (const t of transactions) {
    if (t.type === "transfert") continue; // On ignore les virements internes

    const d = new Date(t.date);
    if (d.getFullYear() !== year) continue;

    const mIdx = d.getMonth();
    const amount = Number(t.amount) || 0;

    months[mIdx].transactionCount += 1;

    if (t.type === "revenu") {
      months[mIdx].income = round2(months[mIdx].income + amount);
      totalIncome = round2(totalIncome + amount);
    } else if (t.type === "dépense") {
      months[mIdx].expense = round2(months[mIdx].expense + amount);
      totalExpense = round2(totalExpense + amount);

      const cat = t.category || "Autre";
      categoryTotals[cat] = round2((categoryTotals[cat] || 0) + amount);

      singleExpenses.push({
        title: t.title || "Sans titre",
        amount,
        category: cat,
        date: t.date,
      });
    }
  }

  // Calcul du solde et du taux d'épargne pour chaque mois
  for (const m of months) {
    m.balance = round2(m.income - m.expense);
    m.savingsRate = m.income > 0 ? round2(((m.income - m.expense) / m.income) * 100) : 0;
  }

  const netSavings = round2(totalIncome - totalExpense);
  const annualSavingsRate = totalIncome > 0 ? round2((netSavings / totalIncome) * 100) : 0;

  // Mois actifs (au moins une dépense ou un revenu)
  const activeMonths = months.filter((m) => m.income > 0 || m.expense > 0);

  // Mois le plus économe : mois actif avec le meilleur taux d'épargne (ou le plus faible montant de dépense)
  let bestMonth = null;
  let heaviestMonth = null;

  if (activeMonths.length > 0) {
    bestMonth = activeMonths.reduce((best, m) =>
      m.savingsRate > (best?.savingsRate ?? -Infinity) ? m : best,
      null
    );
    heaviestMonth = activeMonths.reduce((heaviest, m) =>
      m.expense > (heaviest?.expense ?? -Infinity) ? m : heaviest,
      null
    );
  }

  // Top 5 des plus grosses dépenses unitaires
  singleExpenses.sort((a, b) => b.amount - a.amount);
  const topExpenses = singleExpenses.slice(0, 5);

  // Top catégories par dépenses avec répartition en %
  const topCategories = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? round2((amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const avgMonthlyExpense =
    activeMonths.length > 0 ? round2(totalExpense / activeMonths.length) : 0;
  const avgMonthlyIncome =
    activeMonths.length > 0 ? round2(totalIncome / activeMonths.length) : 0;

  return {
    year,
    summary: {
      totalIncome,
      totalExpense,
      netSavings,
      annualSavingsRate,
      avgMonthlyExpense,
      avgMonthlyIncome,
      activeMonthsCount: activeMonths.length,
      totalTransactions: transactions.length,
    },
    highlights: {
      bestMonth,
      heaviestMonth,
    },
    topExpenses,
    topCategories,
    monthlyBreakdown: months,
  };
}

module.exports = {
  buildMonthComparison,
  buildAnnualReport,
  percentChange,
  round2,
};
