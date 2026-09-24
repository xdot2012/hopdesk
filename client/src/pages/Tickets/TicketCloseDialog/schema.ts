import { z } from 'zod';

export const EFFORT_OPTIONS = [
  15, 30, 45, 60, 90, 120, 180, 240, 360, 480,
] as const;

export const ticketCloseSchema = z.object({
  cause: z.string().trim().min(1),
  solution: z.string().trim().min(1),
  effortMinutes: z.coerce
    .number()
    .refine((value) =>
      EFFORT_OPTIONS.includes(value as (typeof EFFORT_OPTIONS)[number]),
    ),
  asInternalNote: z.boolean(),
});

export type TicketCloseFormType = z.infer<typeof ticketCloseSchema>;
