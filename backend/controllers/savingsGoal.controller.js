// controllers/savingsGoal.controller.js

const SavingsGoal = require("../models/savingsGoal.model");
const logger = require("../logger");

exports.getGoals = async (req, res) => {
  try {
    const goals = await SavingsGoal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(goals);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la récupération des objectifs d'épargne");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.createGoal = async (req, res) => {
  try {
    const { name, targetAmount, targetDate } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Le nom de l'objectif est requis." });
    }
    if (!targetAmount || targetAmount <= 0) {
      return res.status(400).json({ message: "Le montant visé doit être positif." });
    }

    const goal = await SavingsGoal.create({
      user: req.user._id,
      name: name.trim(),
      targetAmount,
      targetDate: targetDate ? new Date(targetDate) : null,
    });

    res.status(201).json(goal);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la création d'un objectif d'épargne");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const goal = await SavingsGoal.findById(id);

    if (!goal) {
      return res.status(404).json({ message: "Objectif introuvable." });
    }
    if (goal.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Action non autorisée." });
    }

    const { name, targetAmount, targetDate } = req.body;
    if (name !== undefined) goal.name = name.trim();
    if (targetAmount !== undefined) {
      if (targetAmount <= 0) {
        return res.status(400).json({ message: "Le montant visé doit être positif." });
      }
      goal.targetAmount = targetAmount;
    }
    if (targetDate !== undefined) goal.targetDate = targetDate ? new Date(targetDate) : null;

    await goal.save();
    res.status(200).json(goal);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la modification d'un objectif d'épargne");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Ajoute (ou retire, avec un montant négatif) une contribution à un
// objectif — jamais en dessous de 0, même si le montant retiré dépasse ce
// qui a déjà été mis de côté
exports.addContribution = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (typeof amount !== "number" || amount === 0) {
      return res.status(400).json({ message: "Montant de contribution invalide." });
    }

    const goal = await SavingsGoal.findById(id);
    if (!goal) {
      return res.status(404).json({ message: "Objectif introuvable." });
    }
    if (goal.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Action non autorisée." });
    }

    goal.currentAmount = Math.max(0, goal.currentAmount + amount);
    await goal.save();

    res.status(200).json(goal);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de l'ajout d'une contribution");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const goal = await SavingsGoal.findById(id);

    if (!goal) {
      return res.status(404).json({ message: "Objectif introuvable." });
    }
    if (goal.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Action non autorisée." });
    }

    await goal.deleteOne();
    res.status(200).json({ message: "Objectif supprimé." });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la suppression d'un objectif d'épargne");
    res.status(500).json({ message: "Erreur serveur." });
  }
};
