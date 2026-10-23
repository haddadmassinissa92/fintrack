// routes/budgetPlan.route.js

const express = require("express");
const { getBudgetPlan } = require("../controllers/budgetPlan.controller");
const protectDataRoute = require("../middlewares/protectDataRoute");

const router = express.Router();

router.get("/", protectDataRoute, getBudgetPlan);

module.exports = router;
