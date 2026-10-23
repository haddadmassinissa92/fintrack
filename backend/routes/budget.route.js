// routes/budget.route.js

const express = require("express");
const { getBudgets, setBudget, deleteBudget } = require("../controllers/budget.controller");
const protectDataRoute = require("../middlewares/protectDataRoute");

const router = express.Router();

router.use(protectDataRoute);

router.get("/", getBudgets);
router.post("/", setBudget);
router.delete("/:id", deleteBudget);

module.exports = router;
