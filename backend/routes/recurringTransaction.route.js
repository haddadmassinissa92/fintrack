// routes/recurringTransaction.route.js

const express = require("express");
const {
  getRecurringTransactions,
  createRecurringTransaction,
  toggleActive,
  deleteRecurringTransaction,
} = require("../controllers/recurringTransaction.controller");
const protectRoute = require("../middlewares/protectRoute");

const router = express.Router();

router.use(protectRoute);

router.get("/", getRecurringTransactions);
router.post("/", createRecurringTransaction);
router.put("/:id/toggle", toggleActive);
router.delete("/:id", deleteRecurringTransaction);

module.exports = router;
