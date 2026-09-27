// routes/savingsGoal.route.js

const express = require("express");
const {
  getGoals,
  createGoal,
  updateGoal,
  addContribution,
  deleteGoal,
} = require("../controllers/savingsGoal.controller");
const protectRoute = require("../middlewares/protectRoute");

const router = express.Router();

router.use(protectRoute);

router.get("/", getGoals);
router.post("/", createGoal);
router.put("/:id", updateGoal);
router.put("/:id/contribute", addContribution);
router.delete("/:id", deleteGoal);

module.exports = router;
