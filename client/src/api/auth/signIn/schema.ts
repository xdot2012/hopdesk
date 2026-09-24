import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email().min(4).max(100),
  password: z.string().min(8).max(200),
  twoFactorCode: z.string().optional(),
  keepConnected: z.boolean(),
})

export type SignInType = z.infer<typeof signInSchema>;
