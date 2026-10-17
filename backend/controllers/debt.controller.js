// controllers/debt.controller.js

const mongoose = require("mongoose");
const Debt = require("../models/debt.model");
const {
  validateNewDebt,
  validatePayment,
  remainingOf,
  parseOptionalDate,
  paidAfterAdding,
  paidAfterRemoving,
} = require("../debt.logic");
const logger = require("../logger");

// Charge une dette uniquement si elle appartient à l'utilisateur connecté.
// Une dette inexistante, au mauvais format d'identifiant, ou appartenant à
// quelqu'un d'autre donnent toutes la même réponse (404) : on ne révèle
// pas qu'un identifiant existe chez un autre compte.
async function findOwnedDebt(req) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return null;
  return Debt.findOne({ _id: id, user: req.user._id });
}

const notFound = (res) => res.status(404).json({ message: "Dette introuvable." });

exports.getDebts = async (req, res) => {
  try {
    const debts = await Debt.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(debts);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la récupération des dettes");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.createDebt = async (req, res) => {
  try {
    const result = validateNewDebt(req.body);
    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    const debt = await Debt.create({ user: req.user._id, ...result.value });
    res.status(201).json(debt);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la création d'une dette");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Enregistre un remboursement (total ou partiel). Refuse un montant qui
// dépasse le reste dû.
//
// La mise à jour est conditionnée à "paidAmount n'a pas changé depuis ma
// lecture" : si deux remboursements arrivent en même temps (double clic),
// le second échoue proprement (409) au lieu d'écraser le premier et de
// dépasser la dette — contrairement à un simple lire-modifier-sauvegarder.
exports.addPayment = async (req, res) => {
  try {
    const debt = await findOwnedDebt(req);
    if (!debt) return notFound(res);

    const remaining = remainingOf(debt.amount, debt.paidAmount);
    const result = validatePayment(req.body?.amount, remaining);
    if (result.error) {
      return res.status(400).json({ message: result.error, remaining: result.remaining });
    }

    const date = parseOptionalDate(req.body?.date);
    if (date === undefined) {
      return res.status(400).json({ message: "Date de remboursement invalide." });
    }

    const updated = await Debt.findOneAndUpdate(
      { _id: debt._id, user: req.user._id, paidAmount: debt.paidAmount },
      {
        $set: { paidAmount: paidAfterAdding(debt.paidAmount, result.value) },
        $push: {
          payments: {
            _id: new mongoose.Types.ObjectId(),
            amount: result.value,
            date: date || new Date(),
          },
        },
      },
      { new: true },
    );

    if (!updated) {
      return res
        .status(409)
        .json({ message: "Cette dette vient d'être modifiée. Réessaie dans un instant." });
    }

    res.status(200).json(updated);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de l'ajout d'un remboursement");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Annule un remboursement saisi par erreur : le retire de l'historique et
// le déduit du total remboursé. Même protection contre les écritures
// simultanées que addPayment.
exports.deletePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const debt = await findOwnedDebt(req);
    if (!debt || !mongoose.isValidObjectId(paymentId)) return notFound(res);

    const payment = debt.payments.id(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "Remboursement introuvable." });
    }

    const updated = await Debt.findOneAndUpdate(
      { _id: debt._id, user: req.user._id, paidAmount: debt.paidAmount },
      {
        $set: { paidAmount: paidAfterRemoving(debt.paidAmount, payment.amount) },
        $pull: { payments: { _id: payment._id } },
      },
      { new: true },
    );

    if (!updated) {
      return res
        .status(409)
        .json({ message: "Cette dette vient d'être modifiée. Réessaie dans un instant." });
    }

    res.status(200).json(updated);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la suppression d'un remboursement");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.deleteDebt = async (req, res) => {
  try {
    const debt = await findOwnedDebt(req);
    if (!debt) return notFound(res);

    await debt.deleteOne();
    res.status(200).json({ message: "Dette supprimée." });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la suppression d'une dette");
    res.status(500).json({ message: "Erreur serveur." });
  }
};
