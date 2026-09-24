import { z } from 'zod';

export const emailNotificationsSchema = z.object({
  ticketEmailOnCreated: z.boolean(),
  ticketEmailOnPublicMessage: z.boolean(),
  ticketEmailOnStatusChange: z.boolean(),
  ticketEmailOnAssignment: z.boolean(),
});

export type EmailNotificationsFormType = z.infer<typeof emailNotificationsSchema>;
