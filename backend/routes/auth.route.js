// routes/auth.route.js

const express = require("express");
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const {
  signup,
  login,
  logout,
  checkAuth,
  updateCurrency,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");
const protectRoute = require("../middlewares/protectRoute");

const router = express.Router();

// Limite les tentatives de connexion pour freiner une attaque par force
// brute sur les mots de passe (10 tentatives max, par adresse IP, toutes
// les 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives. Réessayez dans quelques minutes." },
});

const signupValidation = [
  body("username").trim().isLength({ min: 3 }).withMessage("Nom d'utilisateur trop court."),
  body("email").isEmail().withMessage("Email invalide."),
  body("password").isLength({ min: 6 }).withMessage("Mot de passe trop court."),
];

const validate = (req, res, next) => {
  const { validationResult } = require("express-validator");
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

router.post("/signup", authLimiter, signupValidation, validate, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/check", protectRoute, checkAuth);
router.put("/currency", protectRoute, updateCurrency);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password/:token", authLimiter, resetPassword);

module.exports = router;
