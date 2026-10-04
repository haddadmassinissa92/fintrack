// models/transaction.model.js

const mongoose = require("mongoose");
const { EXPENSE_CATEGORIES, INCOME_CATEGORIES } = require("../constants/categories");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // "revenu" ou "dépense" — détermine si le montant s'ajoute ou se
    // retranche du solde global, et quelles catégories sont valides
    type: {
      type: String,
      enum: ["revenu", "dépense"],
      required: true,
    },

    // Toujours positif ; c'est le champ "type" ci-dessus qui indique le
    // sens (revenu ou dépense), pas le signe du montant
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    category: {
      type: String,
      required: true,
      enum: [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES],
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Photo du ticket/reçu, en data URI (ex. "data:image/jpeg;base64,...").
    // Stockée directement dans le document plutôt que sur un service
    // externe, pour rester simple — la taille est limitée côté
    // contrôleur (voir transaction.controller.js) pour ne pas gonfler
    // démesurément la base de données.
    receiptImage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

// Index composé : la quasi-totalité des requêtes filtrent par utilisateur
// et trient par date (liste des transactions, calculs de stats sur une
// période) — cet index couvre les deux à la fois
transactionSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
