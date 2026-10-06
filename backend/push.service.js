// push.service.js
//
// Envoie des notifications push web à tous les appareils enregistrés
// d'un utilisateur. Si un abonnement n'est plus valide (navigateur
// désinstallé, notifications révoquées...), web-push renvoie une erreur
// 404/410 : on en profite pour nettoyer l'abonnement en base plutôt que
// de réessayer indéfiniment dans le vide.

const webpush = require("web-push");
const PushSubscription = require("./models/pushSubscription.model");
const logger = require("./logger");

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, EMAIL_USER } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquantes.");
  }
  webpush.setVapidDetails(
    `mailto:${EMAIL_USER || "contact@fintrack.app"}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
  configured = true;
}

// Envoie `payload` (objet JSON : { title, body, url }) à tous les
// appareils de cet utilisateur. N'échoue jamais bruyamment : les erreurs
// d'envoi individuelles sont journalisées, pas remontées à l'appelant.
exports.sendPushToUser = async (userId, payload) => {
  try {
    ensureConfigured();
  } catch (error) {
    logger.error({ err: error }, "Push non configuré — notification ignorée");
    return;
  }

  const subscriptions = await PushSubscription.find({ user: userId });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body,
        );
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          // Abonnement expiré/révoqué : on le retire silencieusement
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          logger.error({ err: error }, "Erreur lors de l'envoi d'une notification push");
        }
      }
    }),
  );
};
