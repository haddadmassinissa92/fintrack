// currencyConversion.service.js
//
// Convertit TOUTES les sommes d'argent d'un utilisateur (transactions,
// budgets, objectifs d'épargne, transactions récurrentes) d'une devise
// vers une autre, en une fois, quand il change sa devise dans les
// paramètres. Ce n'est pas un système multi-devises permanent : après
// cette conversion, tout le compte est de nouveau dans une seule devise
// (la nouvelle), exactement comme avant — juste avec les bons montants.

const Transaction = require("./models/transaction.model");
const Budget = require("./models/budget.model");
const SavingsGoal = require("./models/savingsGoal.model");
const RecurringTransaction = require("./models/recurringTransaction.model");
const logger = require("./logger");

// Taux de change via fxratesapi.com — gratuit, sans clé API, couvre le
// DZD (contrairement à beaucoup d'API gratuites limitées aux devises
// majeures). Si cet appel échoue (service indisponible, devise inconnue),
// on préfère arrêter plutôt que convertir avec un taux arbitraire.
async function getExchangeRate(from, to) {
  if (from === to) return 1;

  const url = `https://api.fxratesapi.com/latest?base=${encodeURIComponent(from)}&currencies=${encodeURIComponent(to)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`fxratesapi a répondu ${response.status}`);
  }

  const data = await response.json();
  const rate = data?.rates?.[to];

  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    throw new Error(`Taux de change introuvable pour ${from} -> ${to}`);
  }

  return rate;
}

// Multiplie par `rate` tous les montants de l'utilisateur, dans les 4
// modèles concernés. Fait en plusieurs updateMany ciblés plutôt qu'en
// relisant puis réécrivant chaque document un par un — beaucoup plus
// rapide, même si un utilisateur a des centaines de transactions.
async function convertUserAmounts(userId, rate) {
  const round2 = { $round: [{ $multiply: ["$amount", rate] }, 2] };

  await Promise.all([
    Transaction.updateMany({ user: userId }, [{ $set: { amount: round2 } }]),
    Budget.updateMany({ user: userId }, [
      { $set: { monthlyLimit: { $round: [{ $multiply: ["$monthlyLimit", rate] }, 2] } } },
    ]),
    SavingsGoal.updateMany({ user: userId }, [
      {
        $set: {
          targetAmount: { $round: [{ $multiply: ["$targetAmount", rate] }, 2] },
          currentAmount: { $round: [{ $multiply: ["$currentAmount", rate] }, 2] },
        },
      },
    ]),
    RecurringTransaction.updateMany({ user: userId }, [{ $set: { amount: round2 } }]),
  ]);
}

// Point d'entrée : convertit tout, puis renvoie le taux utilisé — pour
// que le contrôleur puisse le montrer à l'utilisateur ("1 DZD = 0.0065 EUR")
exports.convertUserCurrency = async (userId, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return { rate: 1 };

  const rate = await getExchangeRate(fromCurrency, toCurrency);
  await convertUserAmounts(userId, rate);

  logger.info(
    { userId, fromCurrency, toCurrency, rate },
    "Conversion de devise appliquée aux données de l'utilisateur",
  );

  return { rate };
};
