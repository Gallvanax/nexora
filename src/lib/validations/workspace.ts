import { z } from "zod";
import { workspaceRoleEnum } from "@/lib/validations/project";

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom de l'espace doit contenir au moins 2 caractères.")
    .max(60, "Le nom est trop long."),
  description: z.string().trim().max(400).optional().nullable(),
});

export const inviteMemberSchema = z.object({
  workspaceId: z.string().min(1),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  role: workspaceRoleEnum.exclude(["OWNER"]).default("MEMBER"),
});

export const updateMemberRoleSchema = z.object({
  role: workspaceRoleEnum.exclude(["OWNER"]),
});
