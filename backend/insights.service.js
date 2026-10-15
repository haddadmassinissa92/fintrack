// insights.service.js
//
// Calcule des observations simples sur les dépenses d'un mois, en les
// comparant à la moyenne des mois précédents. Aucune statistique avancée :
// des seuils lisibles ("30 % de plus que d'habitude") plutôt qu'un modèle.
//
// Ce module est PUR (aucun accès à la base de données) : le contrôleur lui
// fournit des totaux déjà agrégés. Ça le rend testable isolément.
//
// Les comparaisons se font toujours à PÉRIODE ÉGALE : si on est le 12 du
// mois, on compare les 12 premiers jours de ce mois aux 12 premiers jours
// des mois précédents — jamais un mois partiel à des mois complets, ce qui
// afficherait une "baisse de 60 %" absurde chaque début de mois. Cette
// mise en correspondance des périodes est faite par le contrôleur.

const SPIKE_RATIO = 1.3; // +30 % ou plus vs la moyenne
const DROP_RATIO = 0.7; // -30 % ou plus vs la moyenne
const OVERALL_THRESHOLD = 0.15; // ±15 % sur le total des dépenses
// Écart minimal, en proportion de la dépense mensuelle moyenne, pour qu'une
// variation compte : sans ça, +200 % sur une catégorie à 300 DZD serait
// signalé alors que ça ne pèse rien dans le budget. Proportionnel plutôt
// qu'un montant fixe, car 300 DZD et 300 EUR n'ont pas du tout le même poids.
const MIN_DELTA_SHARE = 0.05;
const MAX_SPIKES = 2;
const MAX_DROPS = 1;

const sum = (obj) => Object.values(obj).reduce((s, v) => s + v, 0);

// currentExpenseByCategory : { "Alimentation": 12000, ... } (période courante)
// currentIncome            : total des revenus sur la même période
// previousExpenseByCategory: tableau d'objets comme ci-dessus, un par mois
//                            précédent, déjà limités à la même période
// comparable               : false si la période courante est trop courte
//                            (début de mois) pour que la comparaison ait un sens
function buildInsights({
  currentExpenseByCategory,
  currentIncome,
  previousExpenseByCategory,
  comparable,
}) {
  const insights = [];
  const currentTotal = sum(currentExpenseByCategory);

  // Un mois précédent sans aucune dépense (compte pas encore utilisé,
  // vacances sans suivi...) ne doit pas tirer la moyenne vers zéro : on ne
  // moyenne que sur les mois où il y a réellement des données.
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

  if (comparable && n > 0 && averageTotal > 0) {
    const minDelta = averageTotal * MIN_DELTA_SHARE;

    // 1. Variation globale des dépenses
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

    // 2. Catégories qui explosent
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

    // 3. Catégories nettement en dessous de d'habitude (bonne nouvelle)
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

  // 4. Taux d'épargne du mois — ne dépend pas de l'historique, donc utile
  // même pour un tout nouveau compte
  if (currentIncome > 0) {
    insights.push({
      type: "savings_rate",
      rate: Math.round(((currentIncome - currentTotal) / currentIncome) * 100),
      income: currentIncome,
      expense: currentTotal,
    });
  }

  return { insights, comparedMonths: n };
}

module.exports = { buildInsights };
