// server.js

const app = require("./app");
const logger = require("./logger");
const { startRecurringTransactionDispatcher } = require("./recurringTransaction.service");
const { startBudgetAlertDispatcher } = require("./budgetAlert.service");
const { startMonthlyRecapDispatcher } = require("./monthlyRecap.service");
const { backfillCategoryStyles } = require("./categoryStyleBackfill");

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  logger.info(`Serveur FinTrack en écoute sur http://localhost:${PORT}`);
  backfillCategoryStyles();
  startRecurringTransactionDispatcher();
  startBudgetAlertDispatcher();
  startMonthlyRecapDispatcher();
});
