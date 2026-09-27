// routes/budget.route.js

const express = require("express");
const { getBudgets, setBudget, deleteBudget } = require("../controllers/budget.controller");
const protectRoute = require("../middlewares/protectRoute");

const router = express.Router();

router.use(protectRoute);

router.get("/", getBudgets);
router.post("/", setBudget);
router.delete("/:id", deleteBudget);

module.exports = router;
