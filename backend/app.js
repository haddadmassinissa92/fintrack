// app.js
//
// Configuration de l'application Express : middlewares globaux, connexion
// MongoDB, montage des routes. Séparé de server.js pour rester testable
// facilement (les tests peuvent importer "app" sans faire réellement
// écouter un port).

// Configurer les serveurs DNS
const dns = require("dns");
dns.setServers(['8.8.8.8', '8.8.4.4']);

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const logger = require("./logger");

const authRoutes = require("./routes/auth.route");
const transactionRoutes = require("./routes/transaction.route");
const categoryRoutes = require("./routes/category.route");
const savingsGoalRoutes = require("./routes/savingsGoal.route");
const budgetRoutes = require("./routes/budget.route");
const recurringTransactionRoutes = require("./routes/recurringTransaction.route");
const budgetPlanRoutes = require("./routes/budgetPlan.route");
const pushRoutes = require("./routes/push.route");

const app = express();

// Nécessaire derrière un proxy inverse (Render, Railway, Heroku, etc.)
// pour que req.secure / req.ip et express-rate-limit fonctionnent
// correctement, et que les cookies "secure" soient bien posés.
app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/goals", savingsGoalRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/recurring", recurringTransactionRoutes);
app.use("/api/budget-plan", budgetPlanRoutes);
app.use("/api/push", pushRoutes);

app.get("/", (req, res) => {
  res.send("API FinTrack en ligne.");
});

// Connexion à MongoDB, au chargement de ce fichier
if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(process.env.MONGO_URI, { dbName: 'FinTrack' })
    .then(() => logger.info("Connecté à MongoDB"))
    .catch((error) => logger.error({ err: error }, "Erreur de connexion à MongoDB"));
}

module.exports = app;
