// routes/recurringTransaction.route.js

const express = require("express");
const {
  getRecurringTransactions,
  createRecurringTransaction,
  toggleActive,
  deleteRecurringTransaction,
} = require("../controllers/recurringTransaction.controller");
const protectDataRoute = require("../middlewares/protectDataRoute");

const router = express.Router();

router.use(protectDataRoute);

router.get("/", getRecurringTransactions);
router.post("/", createRecurringTransaction);
router.put("/:id/toggle", toggleActive);
router.delete("/:id", deleteRecurringTransaction);

module.exports = router;
