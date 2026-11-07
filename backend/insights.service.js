// insights.service.js
//
// Calcule des observations simples et prédictions IA sur les dépenses d'un mois,
// en les comparant à la moyenne des mois précédents et en projetant la fin de mois.

const SPIKE_RATIO = 1.3; // +30 % ou plus vs la moyenne
const DROP_RATIO = 0.7; // -30 % ou plus vs la moyenne
const OVERALL_THRESHOLD = 0.15; // ±15 % sur le total des dépenses
const MIN_DELTA_SHARE = 0.05;
const MAX_SPIKES = 2;
const MAX_DROPS = 1;

const sum = (obj) => Object.values(obj).reduce((s, v) => s + v, 0);

function getCategoryTip(categoryName, percentage) {
  const norm = (categoryName || "").toLowerCase();
  if (norm.includes("alim") || norm.includes("course") || norm.includes("nourriture")) {
    return `L'alimentation représente ${percentage}% de vos dépenses. Planifier vos repas à l'avance et cuisiner en batch peut vous faire économiser 15 à 20%.`;
  }
  if (norm.includes("resto") || norm.includes("sortie") || norm.includes("bar")) {
    return `Les sorties représentent ${percentage}% de vos dépenses. Fixer un budget hebdomadaire pour les restaurants aide à garder le contrôle.`;
  }
  if (norm.includes("abo") || norm.includes("stream") || norm.includes("loisir")) {
    return `Vos abonnements pèsent ${percentage}% du total. Faites le tri des services non utilisés au moins une fois par trimestre.`;
  }
  if (norm.includes("transp") || norm.includes("carbur")) {
    return `Le transport représente ${percentage}% de vos sorties. Comparer les prix du carburant ou alterner avec les transports doux réduit la facture.`;
  }
  if (norm.includes("shop") || norm.includes("vêtement") || norm.includes("achat")) {
    return `Le shopping représente ${percentage}% de vos dépenses. Appliquer la règle des 48h avant tout achat non essentiel évite les achats impulsifs.`;
  }
  return `La catégorie ${categoryName} représente ${percentage}% de vos dépenses ce mois-ci. Gardez un œil dessus pour respecter vos objectifs.`;
}

function buildInsights({
  currentExpenseByCategory,
  currentIncome,
  previousExpenseByCategory,
  comparable,
  dayLimit = null,
  daysInMonth = null,
  isCurrentMonth = false,
}) {
  const insights = [];
  const currentTotal = sum(currentExpenseByCategory);

  const monthsWithData = previousExpenseByCategory.filter((m) => sum(m) > 0);
  const n = monthsWithData.length;

  let averageTotal = 0;
  const averageByCategory = {};

  if (n > 0) {
    for (const month of monthsWithData) {
      for (const [category, total] of Object.entries(month)) {
        averageByCategory[category] = (averageByCategory[category] || 0) + total / n;
      }
    }
    averageTotal = sum(averageByCategory);
  }

  // 1. Projection de fin de mois (si mois en cours avec quelques jours d'activité)
  if (isCurrentMonth && dayLimit && daysInMonth && dayLimit >= 3 && currentTotal > 0) {
    const dailyAverage = currentTotal / dayLimit;
    const projectedTotal = Math.round(dailyAverage * daysInMonth);
    const projectedSavings = currentIncome > 0 ? Math.round(currentIncome - projectedTotal) : null;

    insights.push({
      type: "month_projection",
      projectedTotal,
      currentTotal,
      dailyAverage: Math.round(dailyAverage),
      projectedSavings,
      currentIncome,
      daysLeft: daysInMonth - dayLimit,
    });
  }

  // 2. Variations vs historique
  if (comparable && n > 0 && averageTotal > 0) {
    const minDelta = averageTotal * MIN_DELTA_SHARE;

    // Variation globale des dépenses
    if (currentTotal > 0) {
      const change = (currentTotal - averageTotal) / averageTotal;
      if (Math.abs(change) >= OVERALL_THRESHOLD) {
        insights.push({
          type: "overall",
          direction: change > 0 ? "up" : "down",
          percent: Math.round(Math.abs(change) * 100),
          current: currentTotal,
          average: averageTotal,
        });
      }
    }

    // Catégories qui explosent
    const spikes = Object.entries(currentExpenseByCategory)
      .map(([category, current]) => ({
        category,
        current,
        average: averageByCategory[category] || 0,
      }))
      .filter(
        (c) =>
          c.average > 0 && c.current >= c.average * SPIKE_RATIO && c.current - c.average >= minDelta,
      )
      .sort((a, b) => b.current - b.average - (a.current - a.average))
      .slice(0, MAX_SPIKES);

    for (const s of spikes) {
      insights.push({
        type: "category_spike",
        category: s.category,
        percent: Math.round(((s.current - s.average) / s.average) * 100),
        current: s.current,
        average: s.average,
      });
    }

    // Catégories nettement en baisse
    const drops = Object.entries(averageByCategory)
      .map(([category, average]) => ({
        category,
        average,
        current: currentExpenseByCategory[category] || 0,
      }))
      .filter(
        (c) =>
          c.average > 0 && c.current <= c.average * DROP_RATIO && c.average - c.current >= minDelta,
      )
      .sort((a, b) => b.average - b.current - (a.average - a.current))
      .slice(0, MAX_DROPS);

    for (const d of drops) {
      insights.push({
        type: "category_drop",
        category: d.category,
        percent: Math.round(((d.average - d.current) / d.average) * 100),
        current: d.current,
        average: d.average,
      });
    }
  }

  // 3. Taux d'épargne du mois
  if (currentIncome > 0) {
    insights.push({
      type: "savings_rate",
      rate: Math.round(((currentIncome - currentTotal) / currentIncome) * 100),
      income: currentIncome,
      expense: currentTotal,
    });
  }

  // 4. Conseil intelligent basé sur le poste de dépense principal (uniquement en contexte d'application réel)
  if ((isCurrentMonth || dayLimit !== null) && currentTotal > 0) {
    const sortedCategories = Object.entries(currentExpenseByCategory).sort((a, b) => b[1] - a[1]);
    if (sortedCategories.length > 0) {
      const [topCategory, topAmount] = sortedCategories[0];
      const percentage = Math.round((topAmount / currentTotal) * 100);
      if (percentage >= 25) {
        insights.push({
          type: "smart_tip",
          category: topCategory,
          percentage,
          amount: topAmount,
          tip: getCategoryTip(topCategory, percentage),
        });
      }
    }
  }

  return { insights, comparedMonths: n };
}

module.exports = { buildInsights };
