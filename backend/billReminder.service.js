// billReminder.service.js
//
// Rappelle à l'utilisateur, quelques jours avant, qu'une dépense récurrente
// (facture, abonnement, loyer...) va être prélevée : notification push
// + email, une seule fois par échéance. Même principe de planification que
// budgetAlert.service.js et recurringTransaction.service.js.
//
// Anti-doublon : on mémorise sur la récurrence elle-même l'échéance déjà
// rappelée (lastReminderFor). Quand recurringTransaction.service.js avance
// nextDueDate à l'occurrence suivante, les deux valeurs diffèrent de
// nouveau et un nouveau rappel peut partir — sans jamais en envoyer deux
// pour la même échéance, même si le serveur redémarre entre-temps.

const RecurringTransaction = require("./models/recurringTransaction.model");
const User = require("./models/user.model");
const { sendBillReminderEmail } = require("./email.service");
const { sendPushToUser } = require("./push.service");
const logger = require("./logger");

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // toutes les 6 heures
const REMINDER_LEAD_DAYS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

function relativeLabel(dueDate, now) {
  const days = Math.ceil((dueDate.getTime() - now.getTime()) / DAY_MS);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "demain";
  return `dans ${days} jours`;
}

async function checkBillReminders() {
  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_LEAD_DAYS * DAY_MS);

    // Uniquement les dépenses actives dont l'échéance tombe dans la
    // fenêtre de rappel. (Les revenus récurrents, comme un salaire,
    // n'ont pas besoin d'être "rappelés".)
    const candidates = await RecurringTransaction.find({
      active: true,
      type: "dépense",
      nextDueDate: { $gt: now, $lte: windowEnd },
    });
    if (candidates.length === 0) return;

    const userIds = [...new Set(candidates.map((r) => r.user.toString()))];
    const users = await User.find({ _id: { $in: userIds } }).select("email currency");
    const userById = new Map(users.map((u) => [u._id.toString(), u]));

    for (const recurring of candidates) {
      try {
        // Déjà rappelée pour cette échéance précise
        if (
          recurring.lastReminderFor &&
          recurring.lastReminderFor.getTime() === recurring.nextDueDate.getTime()
        ) {
          continue;
        }

        const user = userById.get(recurring.user.toString());
        if (!user) continue;

        const label = recurring.description || recurring.category;
        const when = relativeLabel(recurring.nextDueDate, now);
        const currency = user.currency || "DZD";
        const formattedAmount = recurring.amount.toLocaleString("fr-FR", {
          maximumFractionDigits: 0,
        });

        // L'email et le push sont indépendants : l'échec de l'un (clé
        // Brevo bloquée, aucun appareil abonné...) ne doit ni empêcher
        // l'autre, ni faire renvoyer le rappel en boucle toutes les 6 h.
        try {
          await sendBillReminderEmail(user.email, {
            label,
            amount: recurring.amount,
            dueDateLabel: recurring.nextDueDate.toLocaleDateString("fr-FR"),
            relativeLabel: when,
            currency,
          });
        } catch {
          // déjà journalisé dans sendBillReminderEmail
        }

        await sendPushToUser(recurring.user, {
          title: `"${label}" arrive ${when}`,
          body: `${formattedAmount} ${currency} seront prélevés.`,
          url: "/dashboard",
        });

        recurring.lastReminderFor = recurring.nextDueDate;
        await recurring.save();
      } catch (error) {
        logger.error({ err: error }, "Erreur lors du traitement d'un rappel de facture");
      }
    }
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la vérification des rappels de factures");
  }
}

function startBillReminderDispatcher() {
  checkBillReminders();
  setInterval(checkBillReminders, CHECK_INTERVAL_MS);
}

module.exports = { startBillReminderDispatcher };
