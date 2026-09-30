// email.service.js
//
// Envoi d'emails via l'API HTTPS de Brevo (et non en SMTP).
//
// Pourquoi : les services web gratuits de Render bloquent les ports SMTP
// sortants (25, 465, 587), donc Nodemailer + Gmail ne peut pas se connecter
// en production. Une requête HTTPS classique (port 443) n'est pas concernée.
//
// Prérequis côté Brevo :
//   - une clé API (variable BREVO_API_KEY)
//   - une adresse d'expéditeur vérifiée (variable EMAIL_USER)

const logger = require("./logger");

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

exports.sendPasswordResetEmail = async (to, resetUrl) => {
  try {
    const response = await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "FinTrack", email: process.env.EMAIL_USER },
        to: [{ email: to }],
        subject: "Réinitialisation de ton mot de passe FinTrack",
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #059669;">FinTrack</h2>
            <p>Tu as demandé à réinitialiser ton mot de passe.</p>
            <p>
              <a href="${resetUrl}" style="background: #059669; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
                Réinitialiser mon mot de passe
              </a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              Ce lien expire dans 1 heure. Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Brevo a répondu ${response.status} : ${details}`);
    }
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de l'envoi de l'email de réinitialisation");
    throw error;
  }
};

// Alerte un utilisateur par email quand une catégorie budgétée approche
// (80%) ou dépasse (100%) sa limite mensuelle. `level` vaut "warning" ou
// "over" — voir budgetAlert.service.js pour la logique qui décide quand
// cette fonction doit être appelée (une seule fois par palier et par mois).
exports.sendBudgetAlertEmail = async (to, { category, spent, monthlyLimit, level, currency }) => {
  try {
    const percent = Math.round((spent / monthlyLimit) * 100);
    const isOver = level === "over";
    const color = isOver ? "#dc2626" : "#d97706";
    const title = isOver
      ? `Budget "${category}" dépassé`
      : `Budget "${category}" bientôt atteint`;
    const formattedSpent = spent.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
    const formattedLimit = monthlyLimit.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

    const response = await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "FinTrack", email: process.env.EMAIL_USER },
        to: [{ email: to }],
        subject: `FinTrack — ${title}`,
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #059669;">FinTrack</h2>
            <p style="color: ${color}; font-weight: 600;">${title}</p>
            <p>
              Tu as dépensé <strong>${formattedSpent} ${currency}</strong> sur une limite de
              <strong>${formattedLimit} ${currency}</strong> ce mois-ci dans la catégorie
              <strong>${category}</strong> (${percent}%).
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              Tu peux ajuster cette limite à tout moment depuis ton tableau de bord FinTrack.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Brevo a répondu ${response.status} : ${details}`);
    }
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de l'envoi de l'email d'alerte de budget");
    throw error;
  }
};
