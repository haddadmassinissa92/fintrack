// middlewares/protectRoute.js
//
// Vérifie le jeton JWT stocké dans un cookie httpOnly (jamais accessible en
// JavaScript côté navigateur, donc protégé contre le vol par script
// malveillant). Si valide, attache l'utilisateur complet à req.user pour
// que les contrôleurs suivants n'aient pas à refaire cette recherche.

const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const logger = require("../logger");

const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ message: "Non autorisé, connecte-toi." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Utilisateur introuvable." });
    }

    // Un jeton émis avant la dernière déconnexion globale (tokenVersion
    // incrémenté) est refusé, même s'il n'a pas techniquement expiré
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ message: "Session expirée, reconnecte-toi." });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error({ err: error }, "Erreur d'authentification");
    res.status(401).json({ message: "Non autorisé, jeton invalide." });
  }
};

module.exports = protectRoute;
