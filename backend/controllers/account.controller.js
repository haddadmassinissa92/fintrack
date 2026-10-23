// controllers/account.controller.js
//
// Gestion des partages de compte. Ces routes agissent toujours sur le VRAI
// utilisateur connecté (protectRoute seul, voir routes/account.route.js) :
// un partenaire qui consulte le compte d'un propriétaire ne peut donc ni
// inviter d'autres personnes, ni retirer les accès du propriétaire.

const mongoose = require("mongoose");
const AccountShare = require("../models/accountShare.model");
const User = require("../models/user.model");
const { normalizeEmail, maskEmail, checkShareAllowed } = require("../account.logic");
const logger = require("../logger");

// Compte actuellement affiché : le sien, ou celui d'un propriétaire si
// l'en-tête X-Account-Owner est valide (route protégée par
// protectDataRoute, donc req.user est déjà le bon compte). Donne au
// frontend la devise À UTILISER : les montants d'un compte partagé sont
// dans la devise de son propriétaire, pas dans celle du visiteur.
exports.getActiveAccount = (req, res) => {
  res.status(200).json({
    isShared: req.isSharedAccess === true,
    ownerId: req.user._id,
    username: req.user.username,
    currency: req.user.currency || "DZD",
  });
};

exports.getAccounts = async (req, res) => {
  try {
    const me = req.user._id;

    const [sharedByMe, sharedWithMe] = await Promise.all([
      AccountShare.find({ owner: me }).populate("member", "username email").sort({ createdAt: -1 }),
      AccountShare.find({ member: me }).populate("owner", "username").sort({ createdAt: -1 }),
    ]);

    res.status(200).json({
      // Un utilisateur supprimé donne un populate null : on l'écarte
      sharedByMe: sharedByMe
        .filter((s) => s.member)
        .map((s) => ({
          _id: s._id,
          createdAt: s.createdAt,
          member: {
            _id: s.member._id,
            username: s.member.username,
            emailMasked: maskEmail(s.member.email),
          },
        })),
      sharedWithMe: sharedWithMe
        .filter((s) => s.owner)
        .map((s) => ({
          _id: s._id,
          createdAt: s.createdAt,
          owner: { _id: s.owner._id, username: s.owner.username },
        })),
    });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la récupération des partages");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Retrouve le compte visé par un email, et vérifie qu'on a le droit de le
// partager. Renvoie { target } ou répond directement et renvoie null.
async function findShareTarget(req, res) {
  const email = normalizeEmail(req.body?.email);
  if (!email) {
    res.status(400).json({ message: "Email invalide." });
    return null;
  }

  const target = await User.findOne({ email }).select("username email");
  if (!target) {
    res.status(404).json({ message: "Aucun compte FinTrack avec cet email." });
    return null;
  }

  const me = req.user._id;
  const [alreadyShared, currentCount] = await Promise.all([
    AccountShare.exists({ owner: me, member: target._id }),
    AccountShare.countDocuments({ owner: me }),
  ]);

  const refusal = checkShareAllowed({
    ownerId: me,
    targetId: target._id,
    alreadyShared: !!alreadyShared,
    currentCount,
  });
  if (refusal) {
    res.status(refusal.status).json({ message: refusal.message });
    return null;
  }

  return target;
}

// Étape de confirmation : montre QUI est derrière l'email saisi AVANT de
// partager, pour qu'une faute de frappe ne donne pas par erreur accès à
// un inconnu qui aurait un compte à cette adresse.
exports.previewMember = async (req, res) => {
  try {
    const target = await findShareTarget(req, res);
    if (!target) return;
    res.status(200).json({ username: target.username, emailMasked: maskEmail(target.email) });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la recherche d'un membre à inviter");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.createShare = async (req, res) => {
  try {
    const target = await findShareTarget(req, res);
    if (!target) return;

    const share = await AccountShare.create({ owner: req.user._id, member: target._id });
    res.status(201).json({
      _id: share._id,
      createdAt: share.createdAt,
      member: {
        _id: target._id,
        username: target.username,
        emailMasked: maskEmail(target.email),
      },
    });
  } catch (error) {
    // Deux demandes simultanées : l'index unique refuse la seconde
    if (error && error.code === 11000) {
      return res.status(409).json({ message: "Ton compte est déjà partagé avec cette personne." });
    }
    logger.error({ err: error }, "Erreur lors de la création d'un partage");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Retire un partage. Le propriétaire révoque un accès qu'il a donné, ou le
// membre quitte un compte partagé avec lui : même route, mais on ne peut
// supprimer qu'un partage dans lequel on est soi-même partie prenante.
exports.removeShare = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Partage introuvable." });
    }

    const me = req.user._id;
    const removed = await AccountShare.findOneAndDelete({
      _id: id,
      $or: [{ owner: me }, { member: me }],
    });

    if (!removed) {
      return res.status(404).json({ message: "Partage introuvable." });
    }
    res.status(200).json({ message: "Partage supprimé." });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la suppression d'un partage");
    res.status(500).json({ message: "Erreur serveur." });
  }
};
