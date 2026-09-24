import { ChangeEvent, useRef, useState } from 'react';
import { Paperclip, SendHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useCreateTicketMessage from '~/api/ticket/createMessage';
import uploadTicketAttachment from '~/api/ticket/uploadAttachment';
import RichTextEditor from '~/components/RichTextEditor';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { getFileTypeIcon, isImageContentType } from '~/lib/fileVisuals';
import { useAlertStore } from '~/store';
import { getApiErrorMessage } from '~/util/functions';
import { replyFormSchema } from './schema';

type PendingAttachment = {
  localId: string;
  key: string;
  originalFilename: string;
  contentType: string;
  size: number;
  previewUrl?: string;
};

type Props = {
  ticketId: string;
  agent: boolean;
  onSent: () => Promise<unknown>;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReplyForm({ ticketId, agent, onSent }: Props) {
  const { t } = useTranslation();
  const { showErrorSnack, showSuccessSnack } = useAlertStore();
  const { trigger: sendMessage, isMutating: sending } =
    useCreateTicketMessage(ticketId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'internal'>('public');
  const [customerPending, setCustomerPending] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const values = {
    body,
    visibility,
    customerPending,
    attachments: attachments.map(
      ({ key, originalFilename, contentType, size }) => ({
        key,
        originalFilename,
        contentType,
        size,
      }),
    ),
  };
  const valid = replyFormSchema.safeParse(values).success;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = replyFormSchema.safeParse(values);
    if (!result.success) return;
    try {
      await sendMessage({
        ...result.data,
        customerPending:
          agent &&
          result.data.visibility === 'public' &&
          result.data.customerPending,
      });
      attachments.forEach((item) => {
        if (item.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      setBody('');
      setAttachments([]);
      setCustomerPending(false);
      await onSent();
      showSuccessSnack(t('tickets.messageSent'));
    } catch (error: unknown) {
      showErrorSnack(
        getApiErrorMessage(error, t('tickets.messageError')),
      );
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: PendingAttachment[] = [];
      for (const file of files) {
        const previewUrl = file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined;
        const result = await uploadTicketAttachment(file);
        uploaded.push({
          localId: `${result.key}-${Date.now()}-${Math.random()}`,
          key: result.key,
          originalFilename: result.originalFilename,
          contentType: result.contentType,
          size: result.size,
          previewUrl:
            previewUrl ||
            (isImageContentType(result.contentType) ? result.url : undefined),
        });
      }
      setAttachments((current) => [...current, ...uploaded]);
    } catch (error: unknown) {
      showErrorSnack(
        getApiErrorMessage(error, t('tickets.attachmentUploadError')),
      );
    } finally {
      setUploading(false);
    }
  };

  const onPickFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    await uploadFiles(files);
  };

  const removeAttachment = (localId: string) => {
    setAttachments((current) => {
      const target = current.find((item) => item.localId === localId);
      if (target?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((item) => item.localId !== localId);
    });
  };

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="shrink-0 border-t border-border bg-card p-2.5"
    >
      <div className="rounded-lg border border-border bg-background focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/40">
        <RichTextEditor
          value={body}
          onChange={setBody}
          enableMedia={false}
          enableMentions
          compactToolbar
          placeholder={t('tickets.replyPlaceholder')}
          className="border-0 shadow-none"
        />
        {attachments.length > 0 ? (
          <ul className="flex flex-wrap gap-2 border-t border-border px-2.5 py-2">
            {attachments.map((item) => {
              const TypeIcon = getFileTypeIcon(item.contentType);
              return (
                <li
                  key={item.localId}
                  className="flex max-w-[12rem] items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5"
                >
                  {item.previewUrl &&
                  isImageContentType(item.contentType) ? (
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                      <TypeIcon className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium">
                      {item.originalFilename}
                    </p>
                    <p className="text-[10px] tabular-nums text-muted-foreground">
                      {formatFileSize(item.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground"
                    onClick={() => removeAttachment(item.localId)}
                    aria-label={t('tickets.attachmentRemove')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="flex items-center justify-end gap-2 px-1.5 pb-1.5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,video/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.zip"
            onChange={onPickFiles}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground"
            disabled={sending || uploading}
            onClick={() => fileInputRef.current?.click()}
            aria-label={t('tickets.attachmentAdd')}
          >
            <Paperclip className="h-3.5 w-3.5" />
          </Button>
          {agent ? (
            <>
              <div className="flex items-center gap-1.5">
                <Label
                  htmlFor={`ticket-internal-${ticketId}`}
                  className="cursor-pointer text-[11px] font-normal text-muted-foreground"
                >
                  {t('tickets.internalNote')}
                </Label>
                <Switch
                  id={`ticket-internal-${ticketId}`}
                  checked={visibility === 'internal'}
                  onCheckedChange={(checked) => {
                    setVisibility(checked ? 'internal' : 'public');
                    if (checked) setCustomerPending(false);
                  }}
                />
              </div>
              {visibility === 'public' ? (
                <div className="flex items-center gap-1.5">
                  <Label
                    htmlFor={`ticket-pending-${ticketId}`}
                    className="cursor-pointer text-[11px] font-normal text-muted-foreground"
                  >
                    {t('tickets.customerPending')}
                  </Label>
                  <Switch
                    id={`ticket-pending-${ticketId}`}
                    checked={customerPending}
                    onCheckedChange={setCustomerPending}
                  />
                </div>
              ) : null}
            </>
          ) : null}
          <Button
            type="submit"
            size="icon"
            className="h-6 w-6 shrink-0 rounded-full"
            disabled={sending || uploading || !valid}
            aria-label={t('tickets.send')}
          >
            <SendHorizontal className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </form>
  );
}
