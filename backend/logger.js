// logger.js
//
// Logger structuré (pino), utilisé partout dans le backend à la place de
// console.log — plus lisible en développement (pino-pretty) et produit du
// JSON exploitable une fois déployé (utile pour chercher une erreur précise
// dans les logs Render, par exemple).

const pino = require("pino");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

module.exports = logger;
