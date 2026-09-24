import { z } from "zod";
import i18n from "~/i18n";

export function createUpdateProfileSchema() {
  return z.object({
    name: z.string().min(2, i18n.t('validation.nameMin')).max(100),
    email: z.string().email(i18n.t('validation.emailInvalid')).min(4).max(100),
    avatarKey: z.string().max(500).optional().or(z.literal("")),
  });
}

export type UpdateProfileType = z.infer<ReturnType<typeof createUpdateProfileSchema>>;
