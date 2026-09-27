// server.js

const app = require("./app");
const logger = require("./logger");
const { startRecurringTransactionDispatcher } = require("./recurringTransaction.service");

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  logger.info(`Serveur FinTrack en écoute sur http://localhost:${PORT}`);
  startRecurringTransactionDispatcher();
});
