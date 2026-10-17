// routes/debt.route.js

const express = require("express");
const {
  getDebts,
  createDebt,
  addPayment,
  deletePayment,
  deleteDebt,
} = require("../controllers/debt.controller");
const protectRoute = require("../middlewares/protectRoute");

const router = express.Router();

router.use(protectRoute);

router.get("/", getDebts);
router.post("/", createDebt);
router.post("/:id/payments", addPayment);
router.delete("/:id/payments/:paymentId", deletePayment);
router.delete("/:id", deleteDebt);

module.exports = router;
