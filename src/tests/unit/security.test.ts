import { describe, expect, it } from "vitest";
import {
  generateSecureToken,
  hashPassword,
  hashToken,
  timingSafeEqualStrings,
  verifyPassword,
} from "@/lib/auth/crypto";
import { hasMinimumRole, maxRole } from "@/lib/permissions/rbac";
import { validateUploadedFile } from "@/services/storage";

describe("Sécurité, cryptographie et RBAC", () => {
  it("hache et vérifie les mots de passe avec Argon2id", async () => {
    const hash = await hashPassword("NexoraTest#2026");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "NexoraTest#2026")).toBe(true);
    expect(await verifyPassword(hash, "MauvaisMotDePasse")).toBe(false);
  });

  it("génère des jetons aléatoires et compare en temps constant", () => {
    const t1 = generateSecureToken(32);
    const t2 = generateSecureToken(32);
    expect(t1).not.toBe(t2);
    expect(hashToken(t1)).toHaveLength(64);
    expect(timingSafeEqualStrings("abc123", "abc123")).toBe(true);
    expect(timingSafeEqualStrings("abc123", "abc124")).toBe(false);
  });

  it("applique correctement la hiérarchie des rôles RBAC", () => {
    expect(hasMinimumRole("OWNER", "ADMIN")).toBe(true);
    expect(hasMinimumRole("ADMIN", "MEMBER")).toBe(true);
    expect(hasMinimumRole("VIEWER", "MEMBER")).toBe(false);
    expect(maxRole("VIEWER", "ADMIN")).toBe("ADMIN");
    expect(maxRole(null, "MEMBER")).toBe("MEMBER");
  });

  it("bloque les fichiers dangereux ou usurpés et accepte un PNG valide", () => {
    expect(() =>
      validateUploadedFile("script.html", "text/html", Buffer.from("<script>alert(1)</script>"))
    ).toThrow();

    expect(() =>
      validateUploadedFile("fake.png", "image/png", Buffer.from("MZ-not-a-png"))
    ).toThrow();

    const realPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const valid = validateUploadedFile("../mon-image.png", "image/png", realPngHeader);
    expect(valid.safeName).toBe("mon-image.png");
    expect(valid.extension).toBe(".png");
  });
});
