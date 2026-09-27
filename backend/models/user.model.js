// models/user.model.js

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // Devise utilisée pour l'affichage des montants dans toute
    // l'application (pas de conversion réelle, purement un libellé
    // d'affichage choisi par l'utilisateur)
    currency: {
      type: String,
      default: "DZD",
    },

    // Version incrémentée pour invalider tous les jetons de connexion en
    // cours (utile pour "se déconnecter de partout" ou après un
    // changement de mot de passe)
    tokenVersion: {
      type: Number,
      default: 0,
    },

    // Jeton temporaire de réinitialisation de mot de passe : généré à la
    // demande, à usage unique, et valable 1 heure (voir resetPasswordExpires)
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
