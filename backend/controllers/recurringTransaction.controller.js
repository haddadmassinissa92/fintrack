// controllers/recurringTransaction.controller.js

const RecurringTransaction = require("../models/recurringTransaction.model");
const Category = require("../models/category.model");
const logger = require("../logger");

const isValidCategory = async (userId, type, categoryName) => {
  const category = await Category.findOne({ user: userId, type, name: categoryName });
  return !!category;
};

exports.getRecurringTransactions = async (req, res) => {
  try {
    const recurring = await RecurringTransaction.find({ user: req.user._id }).sort({ nextDueDate: 1 });
    res.status(200).json(recurring);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la récupération des transactions récurrentes");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.createRecurringTransaction = async (req, res) => {
  try {
    const { type, amount, category, description, frequency, startDate } = req.body;

    if (!type || !amount || !category || !frequency || !startDate) {
      return res.status(400).json({ message: "Tous les champs requis ne sont pas remplis." });
    }
    if (amount <= 0) {
      return res.status(400).json({ message: "Le montant doit être positif." });
    }
    if (!["weekly", "monthly", "yearly"].includes(frequency)) {
      return res.status(400).json({ message: "Fréquence invalide." });
    }
    if (!(await isValidCategory(req.user._id, type, category))) {
      return res.status(400).json({ message: "Catégorie invalide pour ce type de transaction." });
    }

    const recurring = await RecurringTransaction.create({
      user: req.user._id,
      type,
      amount,
      category,
      description: description?.trim() || "",
      frequency,
      nextDueDate: new Date(startDate),
    });

    res.status(201).json(recurring);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la création d'une transaction récurrente");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Met en pause ou réactive une récurrence, sans la supprimer
exports.toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const recurring = await RecurringTransaction.findById(id);

    if (!recurring) {
      return res.status(404).json({ message: "Transaction récurrente introuvable." });
    }
    if (recurring.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Action non autorisée." });
    }

    recurring.active = !recurring.active;
    await recurring.save();

    res.status(200).json(recurring);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la modification d'une transaction récurrente");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.deleteRecurringTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const recurring = await RecurringTransaction.findById(id);

    if (!recurring) {
      return res.status(404).json({ message: "Transaction récurrente introuvable." });
    }
    if (recurring.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Action non autorisée." });
    }

    await recurring.deleteOne();
    res.status(200).json({ message: "Transaction récurrente supprimée." });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la suppression d'une transaction récurrente");
    res.status(500).json({ message: "Erreur serveur." });
  }
};
