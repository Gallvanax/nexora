import { z } from "zod";

export const passwordPolicySchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(128, "Le mot de passe ne doit pas dépasser 128 caractères.")
  .regex(/[A-Z]/, "Ajoutez au moins une lettre majuscule.")
  .regex(/[a-z]/, "Ajoutez au moins une lettre minuscule.")
  .regex(/[0-9]/, "Ajoutez au moins un chiffre.");

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(80, "Le nom est trop long."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: passwordPolicySchema,
  workspaceName: z
    .string()
    .trim()
    .max(60, "Le nom de l'espace est trop long.")
    .refine(
      (val) => val.length === 0 || val.length >= 2,
      "Le nom de l'espace doit contenir au moins 2 caractères."
    )
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Mot de passe requis.").max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16, "Jeton invalide."),
  password: passwordPolicySchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis."),
  newPassword: passwordPolicySchema,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(80),
  jobTitle: z.string().trim().max(80).optional().nullable(),
  bio: z.string().trim().max(400).optional().nullable(),
  avatarUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (val) =>
        !val || val.startsWith("https://") || val.startsWith("http://") || val.startsWith("/"),
      "URL d'avatar invalide."
    )
    .optional()
    .nullable(),
});

export const updatePreferencesSchema = z.object({
  theme: z.enum(["DARK", "LIGHT", "SYSTEM"]).optional(),
  language: z.enum(["fr", "en"]).optional(),
  timezone: z.string().trim().min(2).max(64).optional(),
  defaultProjectView: z.enum(["GRID", "LIST", "KANBAN"]).optional(),
  emailNotifications: z.boolean().optional(),
  dueSoonReminders: z.boolean().optional(),
  mentionAlerts: z.boolean().optional(),
  projectUpdates: z.boolean().optional(),
});
