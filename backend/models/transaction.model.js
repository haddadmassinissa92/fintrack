// models/transaction.model.js

const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // "revenu", "dépense" ou "transfert" (virement interne entre 2 portefeuilles)
    type: {
      type: String,
      enum: ["revenu", "dépense", "transfert"],
      required: true,
    },

    // Toujours positif ; c'est le champ "type" ci-dessus qui indique le sens
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    // Nom de la catégorie (validé dynamiquement pour les dépenses/revenus, ou "Virement interne" pour un transfert)
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

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Portefeuille source / principal lié à cette transaction
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      default: null,
    },

    // Portefeuille de destination (uniquement pour les transactions de type "transfert")
    toWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      default: null,
    },

    // Photo du ticket/reçu, en data URI
    receiptImage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

// Index composé
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, wallet: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
