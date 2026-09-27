// models/category.model.js
//
// Catégorie de transaction propre à chaque utilisateur. Au moment de
// l'inscription, les catégories par défaut (voir constants/categories.js)
// sont copiées ici pour ce nouvel utilisateur — à partir de là, elles lui
// appartiennent complètement : il peut les renommer ou les supprimer
// comme n'importe quelle catégorie qu'il aurait créée lui-même.

const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["revenu", "dépense"],
      required: true,
    },
    // Classification pour le plan budgétaire 50/30/20 (voir
    // budgetPlan.controller.js) — uniquement pertinent pour les catégories
    // de dépense ; reste "null" tant que l'utilisateur ne l'a pas
    // explicitement classée (ou pour les catégories de revenu, jamais
    // concernées par cette règle)
    budgetType: {
      type: String,
      enum: ["besoin", "envie", "épargne", null],
      default: null,
    },
  },
  { timestamps: true },
);

// Empêche un même utilisateur d'avoir deux fois la même catégorie pour le
// même type (ex. deux fois "Alimentation" en dépense)
categorySchema.index({ user: 1, name: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);
