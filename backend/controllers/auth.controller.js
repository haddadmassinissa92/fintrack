// controllers/auth.controller.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user.model");
const Category = require("../models/category.model");
const { EXPENSE_CATEGORIES, INCOME_CATEGORIES, DEFAULT_BUDGET_TYPES } = require("../constants/categories");
const logger = require("../logger");
const { sendPasswordResetEmail } = require("../email.service");
const { convertUserCurrency } = require("../currencyConversion.service");

// Génère le jeton JWT (valable 30 jours) et le place dans un cookie
// httpOnly — jamais lisible en JavaScript côté navigateur, donc protégé
// contre le vol par script malveillant (XSS)
const isProduction = process.env.NODE_ENV === "production";

// Attributs du cookie JWT. En production, le frontend (Vercel) et le
// backend (Render) sont sur des domaines différents : il faut donc
// sameSite "none" + secure true pour que le navigateur envoie le cookie
// sur les requêtes cross-site. En local (même origine via localhost),
// "lax" + non-secure fonctionne très bien.
const cookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  path: "/",
};

const generateTokenAndSetCookie = (userId, tokenVersion, res) => {
  const token = jwt.sign({ userId, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  res.cookie("jwt", token, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Tous les champs sont requis." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Le mot de passe doit faire au moins 6 caractères." });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email ou ce nom d'utilisateur est déjà utilisé." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({ username, email, password: hashedPassword });

    // Copie les catégories de départ dans le compte du nouvel utilisateur —
    // à partir de là, elles lui appartiennent et peuvent être renommées ou
    // supprimées comme n'importe quelle catégorie qu'il créerait lui-même
    const defaultCategories = [
      ...EXPENSE_CATEGORIES.map((name) => ({
        user: newUser._id,
        name,
        type: "dépense",
        budgetType: DEFAULT_BUDGET_TYPES[name] || null,
      })),
      ...INCOME_CATEGORIES.map((name) => ({ user: newUser._id, name, type: "revenu" })),
    ];
    await Category.insertMany(defaultCategories);

    generateTokenAndSetCookie(newUser._id, newUser.tokenVersion, res);

    res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      currency: newUser.currency,
    });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de l'inscription");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Email ou mot de passe incorrect." });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Email ou mot de passe incorrect." });
    }

    generateTokenAndSetCookie(user._id, user.tokenVersion, res);

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      currency: user.currency,
    });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la connexion");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.logout = (req, res) => {
  // Mêmes attributs qu'à la création, sinon le navigateur ne supprime
  // pas le cookie (surtout en cross-domain avec sameSite "none").
  res.cookie("jwt", "", { ...cookieOptions, maxAge: 0 });
  res.status(200).json({ message: "Déconnecté." });
};

exports.checkAuth = (req, res) => {
  res.status(200).json(req.user);
};

// Change la devise de l'utilisateur ET convertit tous ses montants
// existants (transactions, budgets, objectifs d'épargne, transactions
// récurrentes) au taux de change actuel — contrairement à une simple
// relabellisation, "5000 DZD" devient par ex. "32,50 EUR", pas "5000 EUR".
// Si la récupération du taux échoue, rien n'est modifié : ni la devise,
// ni les montants, pour ne jamais se retrouver avec un libellé qui ne
// correspond plus aux chiffres réels.
exports.updateCurrency = async (req, res) => {
  try {
    const { currency } = req.body;
    if (!currency || typeof currency !== "string") {
      return res.status(400).json({ message: "Devise invalide." });
    }

    const newCurrency = currency.trim().toUpperCase();
    const user = await User.findById(req.user._id);
    const oldCurrency = user.currency;

    if (newCurrency === oldCurrency) {
      return res.status(200).json({ currency: user.currency, rate: 1 });
    }

    let rate;
    try {
      ({ rate } = await convertUserCurrency(req.user._id, oldCurrency, newCurrency));
    } catch (conversionError) {
      logger.error(
        { err: conversionError },
        "Erreur lors de la conversion de devise — devise et montants laissés inchangés",
      );
      return res.status(502).json({
        message: `Impossible de récupérer le taux de change actuel. Détail : ${conversionError.message}`,
      });
    }

    user.currency = newCurrency;
    await user.save();

    res.status(200).json({ currency: user.currency, rate, from: oldCurrency, to: newCurrency });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la mise à jour de la devise");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Génère un jeton temporaire (valable 1h) et envoie un email avec le lien
// de réinitialisation. Ne révèle jamais si l'email existe ou non en base
// (même réponse dans les deux cas), pour ne pas permettre à quelqu'un de
// deviner quels emails sont inscrits sur le service.
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
      user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 heure
      await user.save();

      const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    res.status(200).json({
      message: "Si cet email existe, un lien de réinitialisation vient d'être envoyé.",
    });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la demande de réinitialisation");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Le mot de passe doit faire au moins 6 caractères." });
    }

    // Le jeton reçu par email est comparé à sa version hachée stockée en
    // base — jamais le jeton en clair, au cas où la base fuiterait un jour
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Lien invalide ou expiré." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    // Invalide aussi toutes les sessions déjà ouvertes ailleurs, par
    // précaution (au cas où le mot de passe a été compromis)
    user.tokenVersion += 1;
    await user.save();

    res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la réinitialisation du mot de passe");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

