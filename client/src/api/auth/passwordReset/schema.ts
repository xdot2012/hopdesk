import { z } from "zod";
import i18n from "~/i18n";

export function createPasswordResetSchema() {
  return z.object({
    password: z.string().min(8, i18n.t('validation.passwordMin')).max(200),
    confirm: z.string().min(8).max(200),
  }).refine((data) => data.password === data.confirm, {
    message: i18n.t('validation.passwordMismatch'),
    path: ["confirm"],
  });
}

export type PasswordResetType = z.infer<ReturnType<typeof createPasswordResetSchema>>;
