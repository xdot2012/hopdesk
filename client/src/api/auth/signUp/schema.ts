import { z } from "zod";
import i18n from "~/i18n";

export function createSignUpSchema() {
  return z.object({
    name: z.string().min(2, i18n.t('validation.nameMin')).max(100),
    email: z.string().email(i18n.t('validation.emailInvalid')).min(4).max(100),
    password: z.string().min(8, i18n.t('validation.passwordMin')).max(200),
    confirm: z.string().min(8).max(200),
    avatarKey: z.string().max(500).optional().or(z.literal("")),
    sectorId: z.string().uuid(i18n.t('validation.sectorRequired')),
  }).refine((data) => data.password === data.confirm, {
    message: i18n.t('validation.passwordMismatch'),
    path: ["confirm"],
  });
}

export type SignUpType = z.infer<ReturnType<typeof createSignUpSchema>>;
