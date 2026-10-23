// middlewares/protectDataRoute.js
//
// Authentification + choix du compte dont on manipule les données.
//
// À utiliser UNIQUEMENT sur les routes de données (transactions, budgets,
// objectifs, dettes...). Les routes qui concernent la personne elle-même
// (connexion, devise, export complet, notifications push, gestion des
// partages) gardent protectRoute seul : elles agissent toujours sur le
// vrai utilisateur connecté, jamais sur le compte d'un autre, même avec
// un en-tête X-Account-Owner. C'est ce qui empêche un partenaire de
// changer la devise du propriétaire, d'exporter tout son compte, ou
// d'inviter d'autres personnes à sa place.
//
// Par défaut, req.user est l'utilisateur connecté. Si la requête porte un
// en-tête X-Account-Owner désignant le propriétaire d'un compte partagé
// avec lui, req.user devient CE propriétaire : tous les contrôleurs, qui
// filtrent déjà sur req.user._id, travaillent alors sur ses données sans
// avoir été modifiés. L'utilisateur réellement connecté reste disponible
// dans req.realUser.
//
// L'autorisation est revérifiée en base À CHAQUE requête (jamais mise en
// cache ni lue dans le jeton) : retirer un partage prend effet immédiatement.

const AccountShare = require("../models/accountShare.model");
const User = require("../models/user.model");
const protectRoute = require("./protectRoute");
const logger = require("../logger");

// Une seule réponse pour tous les refus (identifiant mal formé, pas de
// partage, propriétaire disparu) : on ne révèle pas quels comptes existent.
// Le code permet au frontend de revenir tout seul sur le compte personnel.
// Identifiant MongoDB : exactement 24 caractères hexadécimaux. Volontairement
// plus strict que mongoose.isValidObjectId, qui accepte aussi certaines
// chaînes de 12 caractères : pour du contrôle d'accès, aucune ambiguïté.
const OBJECT_ID_HEX = /^[0-9a-fA-F]{24}$/;

const deny = (res) =>
  res.status(403).json({
    message: "Tu n'as pas (ou plus) accès à ce compte.",
    code: "ACCOUNT_ACCESS_DENIED",
  });

const resolveAccount = async (req, res, next) => {
  try {
    const requestedOwner = req.get("x-account-owner");

    // Cas normal : aucun en-tête, ou il désigne soi-même
    if (!requestedOwner || requestedOwner === req.user._id.toString()) {
      return next();
    }

    if (!OBJECT_ID_HEX.test(requestedOwner)) return deny(res);

    // Le partage doit exister, pour CE propriétaire et CE membre
    const share = await AccountShare.findOne({ owner: requestedOwner, member: req.user._id });
    if (!share) return deny(res);

    const owner = await User.findById(requestedOwner).select("-password");
    if (!owner) return deny(res);

    req.realUser = req.user;
    req.user = owner;
    req.isSharedAccess = true;
    next();
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la résolution du compte partagé");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Tableau de middlewares : Express l'accepte tel quel dans router.use()
// et router.get(), dans l'ordre (authentification d'abord)
module.exports = [protectRoute, resolveAccount];
