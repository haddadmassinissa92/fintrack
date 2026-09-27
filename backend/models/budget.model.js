// models/budget.model.js
//
// Une limite mensuelle fixée par l'utilisateur pour une catégorie de
// dépense précise (ex. "Alimentation : 15 000 DZD max"). La limite
// s'applique chaque mois de la même façon — ce n'est pas un budget figé
// pour un mois précis, mais une règle récurrente. Le montant réellement
// dépensé n'est pas stocké ici : il est recalculé à la volée à partir des
// transactions du mois en cours (voir budget.controller.js), pour rester
// toujours exact sans avoir à synchroniser deux sources de vérité.

const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    monthlyLimit: {
      type: Number,
      required: true,
      min: 0.01,
    },
  },
  { timestamps: true },
);

// Une seule limite par catégorie et par utilisateur — en définir une
// nouvelle sur une catégorie déjà budgétée remplace l'ancienne (upsert)
budgetSchema.index({ user: 1, category: 1 }, { unique: true });

module.exports = mongoose.model("Budget", budgetSchema);
