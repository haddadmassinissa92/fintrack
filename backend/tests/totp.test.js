const {
  generateBase32Secret,
  generateTOTP,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  buildOtpAuthUrl,
} = require("../totp.service");

describe("totp.service", () => {
  it("génère un secret Base32 valide", () => {
    const secret = generateBase32Secret();
    expect(secret).toHaveLength(32);
    expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
  });

  it("génère un jeton TOTP à 6 chiffres", () => {
    const secret = generateBase32Secret(20);
    const code = generateTOTP(secret);
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  it("valide un code correct pour l'instant présent", () => {
    const secret = generateBase32Secret(20);
    const code = generateTOTP(secret);
    expect(verifyTOTP(code, secret)).toBe(true);
  });

  it("refuse un mauvais code", () => {
    const secret = generateBase32Secret(20);
    expect(verifyTOTP("000000", secret)).toBe(false);
    expect(verifyTOTP("12345", secret)).toBe(false);
    expect(verifyTOTP("", secret)).toBe(false);
  });

  it("génère et vérifie des codes de secours", () => {
    const codes = generateBackupCodes(4);
    expect(codes).toHaveLength(4);

    const storedCodes = codes.map((c) => ({
      codeHash: hashBackupCode(c),
      used: false,
    }));

    // Premier code valide
    const check1 = verifyBackupCode(codes[0], storedCodes);
    expect(check1.valid).toBe(true);
    expect(check1.codeIndex).toBe(0);

    // Marquer comme utilisé
    storedCodes[0].used = true;

    // Réutilisation refusée
    const checkUsed = verifyBackupCode(codes[0], storedCodes);
    expect(checkUsed.valid).toBe(false);

    // Mauvais code refusé
    const checkBad = verifyBackupCode("bad-code", storedCodes);
    expect(checkBad.valid).toBe(false);
  });

  it("construit une URL otpauth standard", () => {
    const url = buildOtpAuthUrl({ username: "alex", secret: "JBSWY3DPEHPK3PXP" });
    expect(url.startsWith("otpauth://totp/FinTrack%3Aalex?secret=JBSWY3DPEHPK3PXP")).toBe(true);
  });
});
