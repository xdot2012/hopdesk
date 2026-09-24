import { z } from "zod";

export const resendTwoFactorSchema = z.object({
  email: z.string().email().min(4).max(100),
  password: z.string().min(8).max(200),
})
export type ResendTwoFactorType = z.infer<typeof resendTwoFactorSchema>;
