// totp.service.js
//
// Implémentation native et autonome de l'authentification à double facteur (2FA / TOTP)
// selon les standards RFC 6238 (TOTP) et RFC 4226 (HOTP) à l'aide du module crypto de Node.js.
// Compatible avec Google Authenticator, Microsoft Authenticator, Authy, 1Password, etc.

const crypto = require("crypto");

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Génère un secret aléatoire encodé en Base32 standard (32 caractères par défaut)
 */
function generateBase32Secret(length = 32) {
  const bytes = crypto.randomBytes(length);
  let base32 = "";
  for (let i = 0; i < bytes.length; i++) {
    base32 += BASE32_ALPHABET[bytes[i] % 32];
  }
  return base32;
}

/**
 * Décode une chaîne Base32 en Buffer binaire
 */
function base32Decode(base32) {
  const cleaned = (base32 || "")
    .toUpperCase()
    .replace(/=+$/, "")
    .replace(/[\s-]/g, "");

  const binary = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      binary.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(binary);
}

/**
 * Calcule le code TOTP à 6 chiffres pour un secret et un instant donné
 */
function generateTOTP(secret, timeStepSeconds = 30, forTime = Date.now()) {
  const key = base32Decode(secret);
  const counter = Math.floor(forTime / 1000 / timeStepSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const codeInt =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return (codeInt % 1000000).toString().padStart(6, "0");
}

/**
 * Vérifie un code TOTP saisi avec une fenêtre de tolérance (par défaut ±1 pas de 30 secondes)
 * pour compenser d'éventuels décalages d'horloge.
 */
function verifyTOTP(token, secret, window = 1) {
  if (!token || !secret) return false;
  const cleanedToken = token.toString().trim().replace(/[\s-]/g, "");
  if (!/^\d{6}$/.test(cleanedToken)) return false;

  const now = Date.now();
  for (let errorStep = -window; errorStep <= window; errorStep++) {
    const time = now + errorStep * 30 * 1000;
    const expected = generateTOTP(secret, 30, time);
    if (crypto.timingSafeEqual(Buffer.from(cleanedToken), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}

/**
 * Génère une liste de codes de secours d'urgence à usage unique (ex: "a1b2-c3d4")
 */
function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString("hex"); // 8 chars
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    codes.push(formatted);
  }
  return codes;
}

/**
 * Hache un code de secours avec SHA-256 pour stockage sécurisé en base
 */
function hashBackupCode(code) {
  const clean = code.trim().toLowerCase().replace(/-/g, "");
  return crypto.createHash("sha256").update(clean).digest("hex");
}

/**
 * Vérifie si un code correspond à un des codes de secours non utilisés
 */
function verifyBackupCode(inputCode, userBackupCodes = []) {
  if (!inputCode || !userBackupCodes.length) return { valid: false, codeIndex: -1 };
  const inputHash = hashBackupCode(inputCode);

  for (let i = 0; i < userBackupCodes.length; i++) {
    const bc = userBackupCodes[i];
    if (!bc.used && bc.codeHash === inputHash) {
      return { valid: true, codeIndex: i };
    }
  }
  return { valid: false, codeIndex: -1 };
}

/**
 * Construit l'URL standard otpauth pour les applications 2FA
 */
function buildOtpAuthUrl({ username, secret, issuer = "FinTrack" }) {
  const label = encodeURIComponent(`${issuer}:${username}`);
  const encIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

module.exports = {
  generateBase32Secret,
  generateTOTP,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  buildOtpAuthUrl,
};
