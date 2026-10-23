// routes/account.route.js

const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  getActiveAccount,
  getAccounts,
  previewMember,
  createShare,
  removeShare,
} = require("../controllers/account.controller");
const protectRoute = require("../middlewares/protectRoute");
const protectDataRoute = require("../middlewares/protectDataRoute");

const router = express.Router();

// Freine l'exploration d'adresses email (savoir quels comptes existent).
// La clé est l'utilisateur connecté, pas l'adresse IP : derrière le proxy
// Vercel, beaucoup d'utilisateurs partagent la même IP et se bloqueraient
// mutuellement.
const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id),
  message: { message: "Trop de recherches. Réessaie dans quelques minutes." },
});

// Seule route de ce fichier qui suit le compte consulté (protectDataRoute) :
// elle sert justement à savoir lequel est affiché, et dans quelle devise
router.get("/active", protectDataRoute, getActiveAccount);

// Tout le reste agit sur le vrai utilisateur connecté, jamais sur un
// compte partagé avec lui
router.use(protectRoute);
router.get("/", getAccounts);
router.post("/preview", lookupLimiter, previewMember);
router.post("/", lookupLimiter, createShare);
router.delete("/:id", removeShare);

module.exports = router;
