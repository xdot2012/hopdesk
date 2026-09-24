import { z } from 'zod';

export const sectorSchema = z.object({
  name: z.string().trim().min(2),
  color: z.string().min(1),
});

export type SectorFormType = z.infer<typeof sectorSchema>;
