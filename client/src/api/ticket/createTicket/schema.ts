import { z } from 'zod';
import { stripHtmlToText } from '~/lib/richText';

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3),
  description: z
    .string()
    .refine((value) => stripHtmlToText(value).length >= 3),
  externalId: z.string().trim().optional(),
  priorityId: z.string().optional(),
  sectorId: z.union([z.string().uuid(), z.literal('')]).optional(),
});

export type CreateTicketFormType = z.infer<typeof createTicketSchema>;
