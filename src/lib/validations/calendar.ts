import { z } from "zod";
import { recurrenceEnum } from "@/lib/validations/task";

export const createEventSchema = z
  .object({
    workspaceId: z.string().min(1).optional(),
    projectId: z.string().min(1).optional().nullable(),
    title: z.string().trim().min(2, "Le titre de l'événement est requis.").max(140),
    description: z.string().trim().max(1500).optional().nullable(),
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
    allDay: z.boolean().default(false),
    timezone: z.string().trim().min(2).max(64).default("Europe/Paris"),
    recurrence: recurrenceEnum.default("NONE"),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .default("#7C3AED"),
    location: z.string().trim().max(160).optional().nullable(),
  })
  .refine((data) => new Date(data.endAt).getTime() >= new Date(data.startAt).getTime(), {
    message: "La date de fin doit être postérieure à la date de début.",
    path: ["endAt"],
  });

export const updateEventSchema = z.object({
  title: z.string().trim().min(2).max(140).optional(),
  description: z.string().trim().max(1500).optional().nullable(),
  projectId: z.string().min(1).optional().nullable(),
  startAt: z.string().datetime({ offset: true }).optional(),
  endAt: z.string().datetime({ offset: true }).optional(),
  allDay: z.boolean().optional(),
  timezone: z.string().trim().min(2).max(64).optional(),
  recurrence: recurrenceEnum.optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  location: z.string().trim().max(160).optional().nullable(),
});
