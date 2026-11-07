// models/wallet.model.js
//
// Représente un compte bancaire ou portefeuille distinct de l'utilisateur
// (Compte Courant, Livret A / Épargne, Espèces, Investissement...).
// Permet de suivre le solde par poche et d'effectuer des virements internes.

const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["courant", "epargne", "especes", "investissement", "autre"],
      default: "courant",
    },
    initialBalance: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: "#10b981", // Vert émeraude par défaut
    },
    icon: {
      type: String,
      default: "Wallet",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

walletSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Wallet", walletSchema);
