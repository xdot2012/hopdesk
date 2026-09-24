import { z } from 'zod';
import { isRichTextEmpty } from '~/lib/richText';

export const replyFormSchema = z
  .object({
    body: z.string(),
    visibility: z.enum(['public', 'internal']),
    customerPending: z.boolean(),
    attachments: z.array(
      z.object({
        key: z.string().min(1),
        originalFilename: z.string().min(1),
        contentType: z.string(),
        size: z.number().nonnegative(),
      }),
    ),
  })
  .refine(
    (values) =>
      !isRichTextEmpty(values.body) || values.attachments.length > 0,
    { path: ['body'] },
  );

export type ReplyFormType = z.infer<typeof replyFormSchema>;
