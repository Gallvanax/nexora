import { z } from "zod";

export const goalStatusEnum = z.enum(["ON_TRACK", "AT_RISK", "COMPLETED"]);

export const createGoalSchema = z.object({
  workspaceId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional().nullable(),
  title: z.string().trim().min(2, "Titre requis.").max(140),
  description: z.string().trim().max(1000).optional().nullable(),
  targetValue: z.number().int().min(1).max(1_000_000).default(100),
  currentValue: z.number().int().min(0).max(1_000_000).default(0),
  unit: z.string().trim().min(1).max(24).default("%"),
  dueDate: z.string().datetime({ offset: true }).optional().nullable().or(z.literal("")),
  status: goalStatusEnum.default("ON_TRACK"),
});

export const updateGoalSchema = z.object({
  title: z.string().trim().min(2).max(140).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  projectId: z.string().min(1).optional().nullable(),
  targetValue: z.number().int().min(1).max(1_000_000).optional(),
  currentValue: z.number().int().min(0).max(1_000_000).optional(),
  unit: z.string().trim().min(1).max(24).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable().or(z.literal("")),
  status: goalStatusEnum.optional(),
});
