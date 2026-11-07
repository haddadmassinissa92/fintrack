// routes/wallet.route.js

const express = require("express");
const {
  getWallets,
  createWallet,
  updateWallet,
  deleteWallet,
  transferBetweenWallets,
} = require("../controllers/wallet.controller");
const protectDataRoute = require("../middlewares/protectDataRoute");

const router = express.Router();

router.use(protectDataRoute);

router.get("/", getWallets);
router.post("/", createWallet);
router.post("/transfer", transferBetweenWallets);
router.put("/:id", updateWallet);
router.delete("/:id", deleteWallet);

module.exports = router;
