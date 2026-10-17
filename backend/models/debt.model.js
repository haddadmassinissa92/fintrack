// models/debt.model.js
//
// Une dette entre particuliers : de l'argent prêté à un proche ("on me
// doit") ou emprunté ("je dois"). Les remboursements partiels sont
// enregistrés un par un, pour garder l'historique.
//
// Une dette n'est PAS une transaction : prêter 10 000 DZD n'est pas une
// dépense, c'est de l'argent qui doit revenir. Elle ne compte donc ni dans
// les statistiques, ni dans les budgets, ni dans les insights.

const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0.01,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const debtSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Nom de la personne concernée
    person: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    // "owed_to_me" : on me doit cet argent — "i_owe" : je dois cet argent
    direction: {
      type: String,
      enum: ["owed_to_me", "i_owe"],
      required: true,
    },
    // Montant total initial de la dette
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    // Total déjà remboursé. Stocké (plutôt que recalculé à partir de
    // payments) pour que le statut "soldée" reste exact même après une
    // conversion de devise, où chaque montant est arrondi séparément et
    // la somme des paiements pourrait différer du total d'un centime.
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Échéance de remboursement — optionnelle
    dueDate: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    payments: [paymentSchema],
  },
  { timestamps: true },
);

debtSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Debt", debtSchema);
