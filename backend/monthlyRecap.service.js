// monthlyRecap.service.js
//
// Dès qu'un nouveau mois commence, envoie à chaque utilisateur un email
// récapitulatif du mois qui vient de se terminer (revenus, dépenses,
// solde, principales catégories). Un seul envoi par mois et par
// utilisateur, grâce à lastRecapMonth stocké sur son compte — même
// principe que budgetAlert.service.js et recurringTransaction.service.js.
//
// Robuste aux redémarrages : comme la vérification se base sur "le mois
// précédent a-t-il déjà été envoyé ?" plutôt que "sommes-nous exactement
// le 1er aujourd'hui ?", un serveur resté éteint plusieurs jours au
// changement de mois enverra quand même le récapitulatif à son retour,
// sans jamais le dupliquer.

const User = require("./models/user.model");
const Transaction = require("./models/transaction.model");
const { sendMonthlyRecapEmail } = require("./email.service");
const logger = require("./logger");

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // toutes les 6 heures

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function sendRecapForUser(user, startOfPrevMonth, startOfMonth, label) {
  const [totalsAgg, byCategoryAgg, count] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: user._id, date: { $gte: startOfPrevMonth, $lt: startOfMonth } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          user: user._id,
          type: "dépense",
          date: { $gte: startOfPrevMonth, $lt: startOfMonth },
        },
      },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 3 },
    ]),
    Transaction.countDocuments({
      user: user._id,
      date: { $gte: startOfPrevMonth, $lt: startOfMonth },
    }),
  ]);

  // Rien à raconter ce mois-là : on n'envoie pas un email vide
  if (count === 0) return false;

  const totalIncome = totalsAgg.find((t) => t._id === "revenu")?.total || 0;
  const totalExpense = totalsAgg.find((t) => t._id === "dépense")?.total || 0;

  await sendMonthlyRecapEmail(user.email, {
    monthLabel: label,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: count,
    topCategories: byCategoryAgg.map((c) => ({ category: c._id, total: c.total })),
    currency: user.currency || "DZD",
  });

  return true;
}

async function checkMonthlyRecaps() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = monthKey(startOfPrevMonth);
    const label = startOfPrevMonth.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });

    const users = await User.find({ lastRecapMonth: { $ne: prevMonthKey } }).select(
      "email currency lastRecapMonth",
    );
    if (users.length === 0) return;

    for (const user of users) {
      try {
        await sendRecapForUser(user, startOfPrevMonth, startOfMonth, label);
        user.lastRecapMonth = prevMonthKey;
        await user.save();
      } catch (error) {
        logger.error({ err: error }, "Erreur lors de l'envoi d'un récapitulatif mensuel");
      }
    }
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la vérification des récapitulatifs mensuels");
  }
}

function startMonthlyRecapDispatcher() {
  checkMonthlyRecaps();
  setInterval(checkMonthlyRecaps, CHECK_INTERVAL_MS);
}

module.exports = { startMonthlyRecapDispatcher };
