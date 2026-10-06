const express = require("express");
const { getPublicKey, subscribe, unsubscribe } = require("../controllers/push.controller");
const protectRoute = require("../middlewares/protectRoute");

const router = express.Router();

// Publique : le navigateur en a besoin avant même que l'utilisateur
// clique sur "Activer les notifications"
router.get("/public-key", getPublicKey);

router.use(protectRoute);
router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);

module.exports = router;
