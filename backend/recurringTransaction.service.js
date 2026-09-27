// recurringTransaction.service.js
//
// Tâche de fond qui vérifie périodiquement si des transactions récurrentes
// sont arrivées à échéance (nextDueDate dépassée), crée alors la vraie
// transaction correspondante, et avance nextDueDate à la prochaine
// occurrence — même principe que les messages programmés de PladiChat.

const RecurringTransaction = require("./models/recurringTransaction.model");
const Transaction = require("./models/transaction.model");
const logger = require("./logger");

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // vérifie toutes les heures

// Calcule la prochaine échéance à partir de la fréquence choisie — repart
// toujours de la date d'échéance qui vient de passer (pas de "maintenant"),
// pour que la date reste régulière même si le serveur était éteint au
// moment exact de l'échéance (ex. toujours le 1er du mois, jamais un
// glissement progressif vers une autre date)
function computeNextDueDate(currentDueDate, frequency) {
  const next = new Date(currentDueDate);
  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (frequency === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else if (frequency === "yearly") {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

async function processDueRecurringTransactions() {
  try {
    const due = await RecurringTransaction.find({
      active: true,
      nextDueDate: { $lte: new Date() },
    });

    for (const recurring of due) {
      try {
        await Transaction.create({
          user: recurring.user,
          type: recurring.type,
          amount: recurring.amount,
          category: recurring.category,
          description: recurring.description,
          date: recurring.nextDueDate,
        });

        // Avance potentiellement plusieurs fois d'affilée si le serveur
        // est resté éteint longtemps (ex. plusieurs mois manqués) — pour
        // rattraper toutes les échéances passées, pas seulement la première
        let nextDate = computeNextDueDate(recurring.nextDueDate, recurring.frequency);
        while (nextDate <= new Date()) {
          await Transaction.create({
            user: recurring.user,
            type: recurring.type,
            amount: recurring.amount,
            category: recurring.category,
            description: recurring.description,
            date: nextDate,
          });
          nextDate = computeNextDueDate(nextDate, recurring.frequency);
        }

        recurring.nextDueDate = nextDate;
        await recurring.save();
      } catch (error) {
        logger.error({ err: error }, "Erreur lors de la génération d'une transaction récurrente");
      }
    }
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la vérification des transactions récurrentes");
  }
}

function startRecurringTransactionDispatcher() {
  // Un premier passage tout de suite au démarrage (utile si le serveur
  // était éteint et qu'une échéance est déjà passée), puis à intervalle
  // régulier ensuite
  processDueRecurringTransactions();
  setInterval(processDueRecurringTransactions, CHECK_INTERVAL_MS);
}

module.exports = { startRecurringTransactionDispatcher };
