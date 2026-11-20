import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { createProjectSchema } from "@/lib/validations/project";
import { createTaskSchema } from "@/lib/validations/task";
import { createEventSchema } from "@/lib/validations/calendar";

describe("Schémas de validation Zod", () => {
  it("valide une inscription conforme et normalise l'e-mail", () => {
    const parsed = registerSchema.parse({
      name: "Alice Martin",
      email: "  Alice.Martin@Exemple.FR ",
      password: "SuperPassword123",
    });
    expect(parsed.email).toBe("alice.martin@exemple.fr");
  });

  it("rejette un mot de passe trop faible", () => {
    const res = registerSchema.safeParse({
      name: "Bob",
      email: "bob@exemple.fr",
      password: "password",
    });
    expect(res.success).toBe(false);
  });

  it("rejette une connexion avec e-mail invalide", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "abc" }).success).toBe(false);
  });

  it("valide un projet avec modèle et couleur hex", () => {
    const res = createProjectSchema.safeParse({
      name: "Projet SaaS",
      color: "#7C3AED",
      templateKey: "software",
    });
    expect(res.success).toBe(true);
  });

  it("rejette une couleur projet non hexadécimale", () => {
    expect(createProjectSchema.safeParse({ name: "Test", color: "purple" }).success).toBe(false);
  });

  it("valide une tâche et rejette un titre trop court", () => {
    expect(createTaskSchema.safeParse({ projectId: "p1", title: "A" }).success).toBe(false);
    expect(
      createTaskSchema.safeParse({
        projectId: "p1",
        title: "Écrire les tests",
        priority: "HIGH",
      }).success
    ).toBe(true);
  });

  it("rejette un événement dont la fin précède le début", () => {
    const res = createEventSchema.safeParse({
      title: "Réunion",
      startAt: "2026-11-20T12:00:00.000Z",
      endAt: "2026-11-20T10:00:00.000Z",
    });
    expect(res.success).toBe(false);
  });
});
