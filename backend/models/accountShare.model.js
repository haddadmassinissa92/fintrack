// models/accountShare.model.js
//
// Un accès délégué : le propriétaire d'un compte autorise un autre
// utilisateur FinTrack à voir et modifier ses données. Rien n'est copié ni
// fusionné : les données restent celles du propriétaire (un seul compte,
// un seul ensemble de transactions, budgets, dettes...), et le membre y
// accède via ce lien. Supprimer le lien révoque l'accès immédiatement —
// il est revérifié en base à chaque requête (voir resolveAccount.js).

const mongoose = require("mongoose");

const accountShareSchema = new mongoose.Schema(
  {
    // Celui qui partage son compte
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Celui qui reçoit l'accès
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Un même couple propriétaire/membre ne peut exister qu'une fois
accountShareSchema.index({ owner: 1, member: 1 }, { unique: true });
accountShareSchema.index({ member: 1 });

module.exports = mongoose.model("AccountShare", accountShareSchema);
