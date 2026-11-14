// controllers/auth.controller.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user.model");
const Category = require("../models/category.model");
const Transaction = require("../models/transaction.model");
const Budget = require("../models/budget.model");
const SavingsGoal = require("../models/savingsGoal.model");
const RecurringTransaction = require("../models/recurringTransaction.model");
const Debt = require("../models/debt.model");
const Wallet = require("../models/wallet.model");
const PushSubscription = require("../models/pushSubscription.model");
const AccountShare = require("../models/accountShare.model");
const {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  DEFAULT_BUDGET_TYPES,
  DEFAULT_CATEGORY_STYLES,
} = require("../constants/categories");
const logger = require("../logger");
const { sendPasswordResetEmail } = require("../email.service");
const { convertUserCurrency } = require("../currencyConversion.service");
const {
  generateBase32Secret,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  buildOtpAuthUrl,
} = require("../totp.service");

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
        ...DEFAULT_CATEGORY_STYLES[name],
      })),
      ...INCOME_CATEGORIES.map((name) => ({
        user: newUser._id,
        name,
        type: "revenu",
        ...DEFAULT_CATEGORY_STYLES[name],
      })),
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

    // Si le 2FA est activé, demander le code avant d'émettre le cookie final
    if (user.twoFactorEnabled) {
      const preAuthToken = jwt.sign(
        { userId: user._id, isPreAuth: true },
        process.env.JWT_SECRET,
        { expiresIn: "5m" }
      );
      return res.status(200).json({
        requires2FA: true,
        preAuthToken,
        message: "Code d'authentification à deux facteurs requis.",
      });
    }

    generateTokenAndSetCookie(user._id, user.tokenVersion, res);

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      currency: user.currency,
      twoFactorEnabled: false,
    });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la connexion");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Vérifie le code 2FA lors de la connexion pour délivrer la session finale
exports.verifyLogin2FA = async (req, res) => {
  try {
    const { preAuthToken, code } = req.body;
    if (!preAuthToken || !code) {
      return res.status(400).json({ message: "Jeton de session et code requis." });
    }

    let decoded;
    try {
      decoded = jwt.verify(preAuthToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Session 2FA expirée. Veuillez vous reconnecter." });
    }

    if (!decoded.isPreAuth || !decoded.userId) {
      return res.status(401).json({ message: "Jeton 2FA invalide." });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ message: "Configuration 2FA introuvable." });
    }

    const cleanCode = code.trim();
    let isValid = verifyTOTP(cleanCode, user.twoFactorSecret);

    // Vérifier si c'est un code de secours en cas d'impossibilité d'utiliser l'app TOTP
    if (!isValid) {
      const backupCheck = verifyBackupCode(cleanCode, user.twoFactorBackupCodes);
      if (backupCheck.valid) {
        isValid = true;
        user.twoFactorBackupCodes[backupCheck.codeIndex].used = true;
        await user.save();
      }
    }

    if (!isValid) {
      return res.status(400).json({ message: "Code 2FA ou code de secours incorrect." });
    }

    generateTokenAndSetCookie(user._id, user.tokenVersion, res);

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      currency: user.currency,
      twoFactorEnabled: true,
    });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la vérification 2FA");
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

// Export complet de toutes les données de l'utilisateur en un seul
// fichier JSON téléchargeable — transactions, budgets, objectifs
// d'épargne, transactions récurrentes, catégories et dettes. Les photos de
// reçus sont volontairement exclues : elles gonfleraient énormément le
// fichier sans vraiment apporter de valeur de portabilité des données.
exports.exportAccountData = async (req, res) => {
  try {
    const userId = req.user._id;

    const [user, transactions, budgets, goals, recurring, categories, debts, wallets] = await Promise.all([
      User.findById(userId).select("-password"),
      Transaction.find({ user: userId }).select("-receiptImage").sort({ date: -1 }),
      Budget.find({ user: userId }),
      SavingsGoal.find({ user: userId }),
      RecurringTransaction.find({ user: userId }),
      Category.find({ user: userId }),
      Debt.find({ user: userId }),
      Wallet.find({ user: userId }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      account: {
        username: user.username,
        email: user.email,
        currency: user.currency,
        createdAt: user.createdAt,
      },
      wallets,
      transactions,
      budgets,
      savingsGoals: goals,
      recurringTransactions: recurring,
      categories,
      debts,
    };

    const filename = `fintrack-export-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(JSON.stringify(payload, null, 2));
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de l'export complet des données");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Permet à un utilisateur connecté de modifier son mot de passe directement
// depuis ses paramètres sans avoir besoin de passer par un email.
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Le mot de passe actuel et le nouveau mot de passe sont requis." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Le nouveau mot de passe doit faire au moins 6 caractères." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Le mot de passe actuel est incorrect." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    // Incrémente tokenVersion pour invalider les autres sessions actives
    user.tokenVersion += 1;
    await user.save();

    // Renouvelle le cookie JWT avec la nouvelle version pour maintenir la session en cours
    generateTokenAndSetCookie(user._id, user.tokenVersion, res);

    res.status(200).json({ message: "Mot de passe modifié avec succès." });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors du changement de mot de passe");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Modification du profil (nom d'utilisateur et/ou adresse email)
exports.updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    if (username && username.trim()) {
      const cleanUsername = username.trim();
      if (cleanUsername.length < 3) {
        return res.status(400).json({ message: "Le nom d'utilisateur doit contenir au moins 3 caractères." });
      }
      if (cleanUsername !== user.username) {
        const existing = await User.findOne({ username: cleanUsername });
        if (existing) {
          return res.status(400).json({ message: "Ce nom d'utilisateur est déjà utilisé." });
        }
        user.username = cleanUsername;
      }
    }

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        return res.status(400).json({ message: "Format d'email invalide." });
      }
      if (cleanEmail !== user.email) {
        const existing = await User.findOne({ email: cleanEmail });
        if (existing) {
          return res.status(400).json({ message: "Cet email est déjà associé à un autre compte." });
        }
        user.email = cleanEmail;
      }
    }

    await user.save();
    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      currency: user.currency,
    });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la mise à jour du profil");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Suppression définitive du compte et de toutes ses données associées (RGPD)
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Suppression en cascade de toutes les données liées à ce compte
    await Promise.all([
      Transaction.deleteMany({ user: userId }),
      Budget.deleteMany({ user: userId }),
      Category.deleteMany({ user: userId }),
      SavingsGoal.deleteMany({ user: userId }),
      Debt.deleteMany({ user: userId }),
      RecurringTransaction.deleteMany({ user: userId }),
      PushSubscription.deleteMany({ user: userId }),
      Wallet.deleteMany({ user: userId }),
      AccountShare.deleteMany({ $or: [{ owner: userId }, { member: userId }] }),
    ]);

    await User.findByIdAndDelete(userId);

    // Suppression du cookie de session
    res.cookie("jwt", "", { ...cookieOptions, maxAge: 0 });
    res.status(200).json({ message: "Compte et données associées supprimés définitivement." });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la suppression du compte");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Initialisation de la configuration 2FA (génération du secret Base32 et URI pour l'app)
exports.setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const tempSecret = generateBase32Secret(32);
    user.twoFactorTempSecret = tempSecret;
    await user.save();

    const otpauthUrl = buildOtpAuthUrl({
      username: user.username,
      secret: tempSecret,
      issuer: "FinTrack",
    });

    res.status(200).json({
      secret: tempSecret,
      otpauthUrl,
    });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de l'initialisation du 2FA");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Validation et activation définitive du 2FA avec fourniture des codes de secours
exports.enable2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.twoFactorTempSecret) {
      return res.status(400).json({ message: "Aucune configuration 2FA en attente. Veuillez relancer l'activation." });
    }

    const isValid = verifyTOTP(token, user.twoFactorTempSecret);
    if (!isValid) {
      return res.status(400).json({ message: "Code à 6 chiffres incorrect. Vérifiez l'heure de votre appareil." });
    }

    const backupCodes = generateBackupCodes(8);
    user.twoFactorEnabled = true;
    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = null;
    user.twoFactorBackupCodes = backupCodes.map((code) => ({
      codeHash: hashBackupCode(code),
      used: false,
    }));
    await user.save();

    res.status(200).json({
      message: "Authentification à deux facteurs activée avec succès !",
      backupCodes,
    });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de l'activation du 2FA");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Désactivation sécurisée du 2FA (exige mot de passe et code 2FA/secours)
exports.disable2FA = async (req, res) => {
  try {
    const { password, token } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: "Le 2FA n'est pas activé." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Mot de passe incorrect." });
    }

    const cleanCode = (token || "").trim();
    let isCodeValid = verifyTOTP(cleanCode, user.twoFactorSecret);
    if (!isCodeValid) {
      const backupCheck = verifyBackupCode(cleanCode, user.twoFactorBackupCodes);
      if (backupCheck.valid) isCodeValid = true;
    }

    if (!isCodeValid) {
      return res.status(400).json({ message: "Code 2FA ou code de secours incorrect." });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorTempSecret = null;
    user.twoFactorBackupCodes = [];
    await user.save();

    res.status(200).json({ message: "Double authentification désactivée avec succès." });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la désactivation du 2FA");
    res.status(500).json({ message: "Erreur serveur." });
  }
};


