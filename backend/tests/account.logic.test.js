const { MAX_MEMBERS, normalizeEmail, maskEmail, checkShareAllowed } = require("../account.logic");

describe("normalizeEmail", () => {
  it("nettoie les espaces et met en minuscules, comme l'email est stocké", () => {
    expect(normalizeEmail("  Karim@Gmail.COM ")).toBe("karim@gmail.com");
  });

  it("refuse les formats invalides", () => {
    for (const bad of ["karim.gmail.com", "karim@", "karim@gmail", "ka rim@gmail.com", "   ", ""]) {
      expect(normalizeEmail(bad)).toBe(null);
    }
  });

  it("refuse tout ce qui n'est pas du texte (injection d'objet, nombre, null)", () => {
    for (const bad of [123, { $ne: "" }, null, undefined]) {
      expect(normalizeEmail(bad)).toBe(null);
    }
  });

  it("refuse un email démesuré", () => {
    expect(normalizeEmail("a".repeat(250) + "@x.com")).toBe(null);
  });
});

describe("maskEmail", () => {
  it("ne garde que la première lettre et le domaine", () => {
    expect(maskEmail("karim@gmail.com")).toBe("k***@gmail.com");
    expect(maskEmail("k@x.com")).toBe("k***@x.com");
  });

  it("ne laisse pas fuiter le reste de l'adresse", () => {
    expect(maskEmail("karim.haddad@gmail.com").includes("arim")).toBe(false);
  });

  it("ne plante pas sur une valeur invalide", () => {
    expect(maskEmail(undefined)).toBe("***");
    expect(maskEmail("pas-un-email")).toBe("***");
  });
});

describe("checkShareAllowed", () => {
  const base = { ownerId: "a", targetId: "b", alreadyShared: false, currentCount: 0 };

  it("accepte le cas normal", () => {
    expect(checkShareAllowed(base)).toBe(null);
  });

  it("refuse de se partager son propre compte, même si les identifiants ont des types différents", () => {
    expect(checkShareAllowed({ ...base, targetId: "a" }).status).toBe(400);
    expect(checkShareAllowed({ ...base, ownerId: { toString: () => "x" }, targetId: "x" }).status).toBe(400);
  });

  it("refuse un partage déjà existant (409)", () => {
    expect(checkShareAllowed({ ...base, alreadyShared: true }).status).toBe(409);
  });

  it(`limite à ${MAX_MEMBERS} personnes`, () => {
    expect(checkShareAllowed({ ...base, currentCount: MAX_MEMBERS - 1 })).toBe(null);
    expect(checkShareAllowed({ ...base, currentCount: MAX_MEMBERS }).status).toBe(400);
  });
});
