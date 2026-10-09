// models/recurringTransaction.model.js
//
// Un modèle de transaction (loyer, abonnement, salaire...) qui doit être
// recréée automatiquement à intervalle régulier. Ce document ne représente
// jamais une transaction réelle lui-même — c'est recurringTransaction.service.js
// qui, à échéance, crée une vraie Transaction à partir de ces informations
// et avance nextDueDate à la prochaine occurrence.

const mongoose = require("mongoose");

const recurringTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["revenu", "dépense"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    frequency: {
      type: String,
      enum: ["weekly", "monthly", "yearly"],
      required: true,
    },
    // Prochaine date à laquelle une vraie transaction doit être générée —
    // avancée automatiquement après chaque génération
    nextDueDate: {
      type: Date,
      required: true,
    },
    // Permet de mettre en pause une récurrence sans la supprimer (elle
    // garde son historique et ses réglages, mais n'en génère plus)
    active: {
      type: Boolean,
      default: true,
    },
    // Échéance (valeur de nextDueDate) pour laquelle un rappel a déjà été
    // envoyé — voir billReminder.service.js. Quand nextDueDate avance à la
    // prochaine occurrence, elle ne correspond plus et un nouveau rappel
    // peut partir, sans jamais en envoyer deux pour la même échéance.
    lastReminderFor: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("RecurringTransaction", recurringTransactionSchema);
