import { z } from "zod";

export const projectStatusEnum = z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]);
export const workspaceRoleEnum = z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]);

export const createProjectSchema = z.object({
  workspaceId: z.string().min(1).optional(),
  name: z
    .string()
    .trim()
    .min(2, "Le nom du projet doit contenir au moins 2 caractères.")
    .max(80, "Le nom du projet ne doit pas dépasser 80 caractères."),
  description: z.string().trim().max(1000).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Couleur hexadécimale invalide.")
    .default("#7C3AED"),
  icon: z.string().trim().min(1).max(40).default("folder-kanban"),
  deadline: z.string().datetime({ offset: true }).optional().nullable().or(z.literal("")),
  templateKey: z.enum(["blank", "school", "software", "business", "personal"]).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  icon: z.string().trim().min(1).max(40).optional(),
  status: projectStatusEnum.optional(),
  deadline: z.string().datetime({ offset: true }).optional().nullable().or(z.literal("")),
  isFavorite: z.boolean().optional(),
});

export const addProjectMemberSchema = z.object({
  userId: z.string().min(1),
  role: workspaceRoleEnum.exclude(["OWNER"]).default("MEMBER"),
});
