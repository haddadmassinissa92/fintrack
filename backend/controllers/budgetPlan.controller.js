// controllers/budgetPlan.controller.js
//
// Calcule le plan budgétaire 50/30/20 du mois en cours : à partir du
// revenu total du mois, définit les montants cibles pour chaque catégorie
// (50% besoins, 30% envies, 20% épargne), et les compare aux dépenses
// réelles du mois, regroupées selon la classification donnée à chaque
// catégorie (voir category.controller.js).

const Transaction = require("../models/transaction.model");
const Category = require("../models/category.model");
const logger = require("../logger");

exports.getBudgetPlan = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [categories, incomeAgg, expenseByCategoryAgg] = await Promise.all([
      Category.find({ user: userId, type: "dépense" }),
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            type: "revenu",
            date: { $gte: startOfMonth, $lt: startOfNextMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            type: "dépense",
            date: { $gte: startOfMonth, $lt: startOfNextMonth },
          },
        },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalIncome = incomeAgg[0]?.total || 0;

    // Associe chaque catégorie dépensée ce mois-ci à sa classification —
    // les catégories non classées (ou supprimées depuis) tombent dans
    // "nonClassifie", pour ne jamais perdre de dépenses réelles du calcul
    const budgetTypeByCategory = Object.fromEntries(
      categories.map((c) => [c.name, c.budgetType]),
    );

    const spent = { besoin: 0, envie: 0, épargne: 0, nonClassifie: 0 };
    expenseByCategoryAgg.forEach((e) => {
      const budgetType = budgetTypeByCategory[e._id];
      if (budgetType && spent[budgetType] !== undefined) {
        spent[budgetType] += e.total;
      } else {
        spent.nonClassifie += e.total;
      }
    });

    const targets = {
      besoin: totalIncome * 0.5,
      envie: totalIncome * 0.3,
      épargne: totalIncome * 0.2,
    };

    res.status(200).json({ totalIncome, targets, spent });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors du calcul du plan budgétaire");
    res.status(500).json({ message: "Erreur serveur." });
  }
};
