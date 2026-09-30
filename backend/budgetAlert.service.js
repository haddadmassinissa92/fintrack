// budgetAlert.service.js
//
// Tâche de fond qui vérifie périodiquement, pour CHAQUE budget de CHAQUE
// utilisateur, si les dépenses du mois en cours franchissent le seuil
// d'alerte (80%) ou de dépassement (100%), et envoie alors un email —
// une seule fois par palier et par mois, grâce à lastAlertMonth/
// lastAlertLevel stockés sur le budget lui-même (voir budget.model.js).
// Même principe de planification que recurringTransaction.service.js.

const Budget = require("./models/budget.model");
const Transaction = require("./models/transaction.model");
const User = require("./models/user.model");
const { sendBudgetAlertEmail } = require("./email.service");
const logger = require("./logger");

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // toutes les 6 heures

function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Détermine le palier atteint par une dépense par rapport à sa limite,
// ou null si elle reste sous le seuil d'alerte
function levelFor(spent, monthlyLimit) {
  if (spent > monthlyLimit) return "over";
  if (spent / monthlyLimit >= 0.8) return "warning";
  return null;
}

async function checkBudgetAlerts() {
  try {
    const now = new Date();
    const monthKey = currentMonthKey(now);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const budgets = await Budget.find({});
    if (budgets.length === 0) return;

    // Une seule agrégation pour tous les utilisateurs et toutes les
    // catégories du mois en cours, plutôt qu'une requête par budget
    const spentAgg = await Transaction.aggregate([
      {
        $match: {
          type: "dépense",
          date: { $gte: startOfMonth, $lt: startOfNextMonth },
        },
      },
      {
        $group: {
          _id: { user: "$user", category: "$category" },
          total: { $sum: "$amount" },
        },
      },
    ]);

    const spentByUserCategory = new Map(
      spentAgg.map((s) => [`${s._id.user}-${s._id.category}`, s.total]),
    );

    // Les emails des utilisateurs concernés, récupérés une seule fois
    const userIds = [...new Set(budgets.map((b) => b.user.toString()))];
    const users = await User.find({ _id: { $in: userIds } }).select("email currency");
    const userById = new Map(users.map((u) => [u._id.toString(), u]));

    for (const budget of budgets) {
      try {
        const spent = spentByUserCategory.get(`${budget.user}-${budget.category}`) || 0;
        const level = levelFor(spent, budget.monthlyLimit);

        // Rien à signaler, ou déjà signalé pour ce palier ce mois-ci
        if (!level) continue;
        if (budget.lastAlertMonth === monthKey && budget.lastAlertLevel === level) continue;

        const user = userById.get(budget.user.toString());
        if (!user) continue;

        await sendBudgetAlertEmail(user.email, {
          category: budget.category,
          spent,
          monthlyLimit: budget.monthlyLimit,
          level,
          currency: user.currency || "DZD",
        });

        budget.lastAlertMonth = monthKey;
        budget.lastAlertLevel = level;
        await budget.save();
      } catch (error) {
        logger.error({ err: error }, "Erreur lors du traitement d'une alerte de budget");
      }
    }
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la vérification des alertes de budget");
  }
}

function startBudgetAlertDispatcher() {
  checkBudgetAlerts();
  setInterval(checkBudgetAlerts, CHECK_INTERVAL_MS);
}

module.exports = { startBudgetAlertDispatcher };
