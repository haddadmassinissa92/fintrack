// routes/recurringTransaction.route.js

const express = require("express");
const {
  getRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  toggleActive,
  deleteRecurringTransaction,
  processRecurring,
} = require("../controllers/recurringTransaction.controller");
const protectDataRoute = require("../middlewares/protectDataRoute");

const router = express.Router();

router.use(protectDataRoute);

router.get("/", getRecurringTransactions);
router.post("/process", processRecurring);
router.post("/", createRecurringTransaction);
router.put("/:id", updateRecurringTransaction);
router.put("/:id/toggle", toggleActive);
router.delete("/:id", deleteRecurringTransaction);

module.exports = router;
