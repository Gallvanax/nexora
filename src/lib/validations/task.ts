import { z } from "zod";

export const taskStatusEnum = z.enum(["TODO", "IN_PROGRESS", "ON_HOLD", "DONE"]);
export const taskPriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
export const recurrenceEnum = z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]);

export const createTaskSchema = z.object({
  projectId: z.string().min(1, "Projet requis."),
  title: z
    .string()
    .trim()
    .min(2, "Le titre doit contenir au moins 2 caractères.")
    .max(160, "Le titre est trop long."),
  description: z.string().trim().max(4000).optional().nullable(),
  status: taskStatusEnum.default("TODO"),
  priority: taskPriorityEnum.default("NORMAL"),
  assigneeId: z.string().min(1).optional().nullable(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable().or(z.literal("")),
  recurrence: recurrenceEnum.default("NONE"),
  estimatedMinutes: z.number().int().min(1).max(10080).optional().nullable(),
  labelIds: z.array(z.string().min(1)).max(10).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(4000).optional().nullable(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  position: z.number().int().min(0).optional(),
  assigneeId: z.string().min(1).optional().nullable(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable().or(z.literal("")),
  recurrence: recurrenceEnum.optional(),
  estimatedMinutes: z.number().int().min(1).max(10080).optional().nullable(),
  loggedMinutes: z.number().int().min(0).max(100000).optional(),
  labelIds: z.array(z.string().min(1)).max(10).optional(),
});

export const bulkTasksSchema = z.object({
  taskIds: z.array(z.string().min(1)).min(1, "Sélectionnez au moins une tâche.").max(100),
  action: z.enum(["STATUS", "PRIORITY", "DELETE"]),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
});

export const createSubtaskSchema = z.object({
  title: z.string().trim().min(1, "Titre requis.").max(160),
});

export const updateSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  isCompleted: z.boolean().optional(),
});

export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Le commentaire ne peut pas être vide.")
    .max(2000, "Le commentaire est trop long."),
});
