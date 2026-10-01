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
// majeures). On ne change jamais la devise de base de la requête (ça fait
// partie des fonctionnalités payantes de ce service) : on récupère les
// deux taux par rapport à la devise de référence par défaut, puis on
// calcule nous-mêmes le taux croisé — ça fonctionne quelle que soit cette
// référence par défaut.
async function getExchangeRate(from, to) {
  if (from === to) return 1;

  const url = `https://api.fxratesapi.com/latest?symbols=${encodeURIComponent(from)},${encodeURIComponent(to)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`fxratesapi a répondu ${response.status} : ${body}`);
  }

  const data = await response.json();
  const rateFrom = data?.rates?.[from];
  const rateTo = data?.rates?.[to];

  if (typeof rateFrom !== "number" || typeof rateTo !== "number") {
    throw new Error(
      `Taux de change introuvable pour ${from} ou ${to} — réponse : ${JSON.stringify(data)}`,
    );
  }

  // rateFrom et rateTo sont tous deux exprimés par rapport à la même
  // devise de référence (ex. USD), donc leur rapport donne le taux
  // croisé from -> to, sans jamais avoir besoin de changer cette
  // référence nous-mêmes.
  return rateTo / rateFrom;
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
