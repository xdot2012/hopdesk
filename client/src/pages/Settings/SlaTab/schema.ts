import { z } from 'zod';

export const slaSchema = z.object({
  timezone: z.string().min(1),
  targets: z.array(
    z.object({
      priorityId: z.string().min(1),
      priorityCode: z.string().nullish(),
      priorityLabel: z.string(),
      firstResponseMinutes: z.coerce.number().int().min(1),
      resolutionMinutes: z.coerce.number().int().min(1),
    }),
  ),
});

export type SlaFormType = z.infer<
  typeof slaSchema
>;
