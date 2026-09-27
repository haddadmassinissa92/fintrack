// controllers/budget.controller.js

const Budget = require("../models/budget.model");
const Transaction = require("../models/transaction.model");
const logger = require("../logger");

// Renvoie chaque budget défini, accompagné du montant réellement dépensé
// ce mois-ci dans la catégorie correspondante — calculé à la volée à
// partir des transactions plutôt que stocké, pour rester toujours exact
exports.getBudgets = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [budgets, spentAgg] = await Promise.all([
      Budget.find({ user: userId }).sort({ category: 1 }),
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

    const spentByCategory = Object.fromEntries(spentAgg.map((s) => [s._id, s.total]));

    const budgetsWithSpending = budgets.map((b) => ({
      _id: b._id,
      category: b.category,
      monthlyLimit: b.monthlyLimit,
      spent: spentByCategory[b.category] || 0,
    }));

    res.status(200).json(budgetsWithSpending);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la récupération des budgets");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Crée ou remplace la limite d'une catégorie (upsert) — définir un
// nouveau budget sur une catégorie déjà budgétée met simplement à jour la
// limite existante plutôt que d'en créer une deuxième
exports.setBudget = async (req, res) => {
  try {
    const { category, monthlyLimit } = req.body;

    if (!category || !category.trim()) {
      return res.status(400).json({ message: "La catégorie est requise." });
    }
    if (!monthlyLimit || monthlyLimit <= 0) {
      return res.status(400).json({ message: "La limite doit être positive." });
    }

    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, category: category.trim() },
      { monthlyLimit },
      { new: true, upsert: true },
    );

    res.status(200).json(budget);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la définition d'un budget");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findById(id);

    if (!budget) {
      return res.status(404).json({ message: "Budget introuvable." });
    }
    if (budget.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Action non autorisée." });
    }

    await budget.deleteOne();
    res.status(200).json({ message: "Budget supprimé." });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la suppression d'un budget");
    res.status(500).json({ message: "Erreur serveur." });
  }
};
