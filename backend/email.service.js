// email.service.js
//
// Envoi d'emails via Gmail + Nodemailer — même choix que sur blog-app,
// pour rester simple sans avoir besoin d'acheter un nom de domaine
// (contrairement à Resend, qui demande un domaine vérifié pour de gros
// volumes). Nécessite un "mot de passe d'application" Gmail (pas le vrai
// mot de passe du compte) : à générer dans les paramètres de sécurité
// Google, une fois la validation en 2 étapes activée.

const nodemailer = require("nodemailer");
const logger = require("./logger");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendPasswordResetEmail = async (to, resetUrl) => {
  try {
    await transporter.sendMail({
      from: `"FinTrack" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Réinitialisation de ton mot de passe FinTrack",
      html: `
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
    });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de l'envoi de l'email de réinitialisation");
    throw error;
  }
};
