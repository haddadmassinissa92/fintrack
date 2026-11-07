// recurringTransaction.service.js
//
// Tâche de fond et exécution à la demande qui vérifie périodiquement si des transactions récurrentes
// sont arrivées à échéance (nextDueDate dépassée), crée alors la vraie
// transaction correspondante, et avance nextDueDate à la prochaine
// occurrence.

const RecurringTransaction = require("./models/recurringTransaction.model");
const Transaction = require("./models/transaction.model");
const logger = require("./logger");

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // vérifie toutes les heures

// Calcule la prochaine échéance à partir de la fréquence choisie
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

/**
 * Traite les transactions récurrentes échues, soit pour tous les utilisateurs,
 * soit pour un utilisateur spécifique (à la demande lorsqu'il consulte son compte).
 */
async function processDueRecurringTransactions(userId = null) {
  try {
    const filter = {
      active: true,
      nextDueDate: { $lte: new Date() },
    };
    if (userId) filter.user = userId;

    const due = await RecurringTransaction.find(filter);
    let createdCount = 0;

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
        createdCount++;

        // Avance potentiellement plusieurs fois d'affilée si le serveur
        // est resté éteint longtemps pour rattraper toutes les échéances passées
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
          createdCount++;
          nextDate = computeNextDueDate(nextDate, recurring.frequency);
        }

        recurring.nextDueDate = nextDate;
        await recurring.save();
      } catch (error) {
        logger.error({ err: error }, "Erreur lors de la génération d'une transaction récurrente");
      }
    }
    return createdCount;
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la vérification des transactions récurrentes");
    return 0;
  }
}

function startRecurringTransactionDispatcher() {
  processDueRecurringTransactions();
  setInterval(processDueRecurringTransactions, CHECK_INTERVAL_MS);
}

module.exports = {
  startRecurringTransactionDispatcher,
  processDueRecurringTransactions,
};
