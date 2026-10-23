// routes/transaction.route.js

const express = require("express");
const {
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  getStats,
  exportTransactions,
  importTransactions,
  getInsights,
} = require("../controllers/transaction.controller");
const protectDataRoute = require("../middlewares/protectDataRoute");

const router = express.Router();

// Toutes les routes de ce fichier nécessitent d'être connecté
router.use(protectDataRoute);

router.get("/stats", getStats);
router.get("/insights", getInsights);
router.get("/export", exportTransactions);
router.get("/", getTransactions);
router.post("/", createTransaction);
router.post("/import", importTransactions);
router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

module.exports = router;
