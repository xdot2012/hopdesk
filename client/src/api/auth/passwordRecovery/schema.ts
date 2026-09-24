import { z } from "zod";

export const passwordReceverySchema = z.object({
  email: z.string().email().min(4).max(100),
})

export type PasswordRecoveryType = z.infer<typeof passwordReceverySchema>;
