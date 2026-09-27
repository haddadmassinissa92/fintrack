// routes/budgetPlan.route.js

const express = require("express");
const { getBudgetPlan } = require("../controllers/budgetPlan.controller");
const protectRoute = require("../middlewares/protectRoute");

const router = express.Router();

router.get("/", protectRoute, getBudgetPlan);

module.exports = router;
