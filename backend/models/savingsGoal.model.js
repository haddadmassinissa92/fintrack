// models/savingsGoal.model.js
//
// Un objectif d'épargne, avec une progression suivie manuellement (l'utilisateur
// ajoute des contributions au fil du temps) plutôt que déduite automatiquement
// des transactions — plus simple, et laisse le choix à l'utilisateur de compter
// ou non une dépense/économie précise vers cet objectif.

const mongoose = require("mongoose");

const savingsGoalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Date visée pour atteindre l'objectif — optionnelle, purement informative
    targetDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SavingsGoal", savingsGoalSchema);
