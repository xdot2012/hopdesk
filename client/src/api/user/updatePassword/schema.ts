import { z } from "zod";
import i18n from "~/i18n";

export function createUpdatePasswordSchema() {
  return z.object({
    oldPassword: z.string().min(8, i18n.t('validation.passwordMin')).max(200),
    newPassword: z.string().min(8, i18n.t('validation.passwordMin')).max(200),
  });
}

export type UpdatePasswordType = z.infer<ReturnType<typeof createUpdatePasswordSchema>>;
