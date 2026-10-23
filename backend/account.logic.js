// account.logic.js
//
// Règles pures du partage de compte (aucun accès à la base de données) :
// normalisation et masquage des emails, validation d'une demande de partage.

const MAX_MEMBERS = 5; // nombre maximum de personnes ayant accès à un compte

// Format basique d'email, comme le fait déjà l'inscription (la vraie
// vérification, c'est l'existence du compte). Renvoie l'email nettoyé
// (sans espaces, en minuscules — comme il est stocké en base), ou null.
function normalizeEmail(raw) {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

// "karim@gmail.com" -> "k***@gmail.com" : assez pour que le propriétaire
// reconnaisse la personne, sans exposer l'adresse complète d'un compte
// qui n'est pas le sien (ni dans la confirmation, ni dans la liste).
function maskEmail(email) {
  if (typeof email !== "string" || !email.includes("@")) return "***";
  const at = email.lastIndexOf("@");
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local.charAt(0)}***@${domain}`;
}

// Vérifie qu'on peut partager `ownerId` avec `targetId`.
// Renvoie null si c'est permis, sinon { status, message }.
function checkShareAllowed({ ownerId, targetId, alreadyShared, currentCount }) {
  if (String(ownerId) === String(targetId)) {
    return { status: 400, message: "Tu ne peux pas partager ton compte avec toi-même." };
  }
  if (alreadyShared) {
    return { status: 409, message: "Ton compte est déjà partagé avec cette personne." };
  }
  if (currentCount >= MAX_MEMBERS) {
    return {
      status: 400,
      message: `Tu ne peux pas partager ton compte avec plus de ${MAX_MEMBERS} personnes.`,
    };
  }
  return null;
}

module.exports = { MAX_MEMBERS, normalizeEmail, maskEmail, checkShareAllowed };
