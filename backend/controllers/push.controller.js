const PushSubscription = require("../models/pushSubscription.model");
const logger = require("../logger");

// La clé publique VAPID n'est pas un secret — c'est elle que le
// navigateur utilise pour créer l'abonnement, elle doit donc être
// accessible sans authentification
exports.getPublicKey = (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(503).json({ message: "Notifications push non configurées." });
  }
  res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

exports.subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: "Abonnement push invalide." });
    }

    // upsert : un même endpoint peut être renvoyé plusieurs fois par le
    // navigateur (réabonnement), on met simplement à jour plutôt que de
    // dupliquer
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: req.user._id, endpoint, keys },
      { upsert: true, new: true },
    );

    res.status(201).json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de l'enregistrement de l'abonnement push");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: "Endpoint manquant." });
    }
    await PushSubscription.deleteOne({ endpoint, user: req.user._id });
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la désinscription push");
    res.status(500).json({ message: "Erreur serveur." });
  }
};
