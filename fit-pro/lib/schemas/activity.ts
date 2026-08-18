import { z } from "zod";

export const activitySchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome da atividade").max(120),
    recurrence: z.enum(["weekday", "date"]),
    weekday: z.number().int().min(0).max(6).nullable(),
    date: z.string().trim().nullable(),
    time_of_day: z.string().trim().nullable(),
    duration_minutes: z.number().int().min(1).nullable(),
    notes: z.string().trim().nullable(),
  })
  .refine((v) => (v.recurrence === "weekday" ? v.weekday !== null : !!v.date), {
    message: "Informe o dia da semana ou a data",
    path: ["weekday"],
  });

export type ActivityValues = z.infer<typeof activitySchema>;
