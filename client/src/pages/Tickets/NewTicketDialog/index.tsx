import {
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CircleHelp,
  Flag,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useCreateTicket from '~/api/ticket/createTicket';
import type { CreateTicketAttachmentPayload } from '~/api/ticket/createTicket';
import useListPriorities from '~/api/ticket/listPriorities';
import uploadTicketAttachment from '~/api/ticket/uploadAttachment';
import useListSectors from '~/api/sector/listSectors';
import RichTextEditor from '~/components/RichTextEditor';
import SelectField from '~/components/SelectField';
import { TicketPrioritySelect } from '~/components/TicketBadges';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import { isImageContentType } from '~/lib/fileVisuals';
import { stripHtmlToText } from '~/lib/richText';
import { cn } from '~/lib/utils';
import { KNOWLEDGE_BASE_PRIORITY_GUIDE_SLUG } from '~/router/paths';
import useKnowledgeBaseNavigation from '~/hooks/useKnowledgeBaseNavigation';
import {
  useAlertStore,
  useNewTicketDialogStore,
  useTicketDetailDialogStore,
  useUserStore,
} from '~/store';
import { getApiErrorMessage } from '~/util/functions';
import TicketKnowledgeSuggestions from '~/pages/Tickets/TicketKnowledgeSuggestions';
import FieldBlock from './FieldBlock';
import FileTypeIcon from './FileTypeIcon';
import NewTicketForm from './Form';

type PendingAttachment = CreateTicketAttachmentPayload & {
  localId: string;
  previewUrl?: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function filesFromClipboard(event: ClipboardEvent): File[] {
  const fromFiles = Array.from(event.clipboardData.files ?? []);
  if (fromFiles.length > 0) return fromFiles;

  const files: File[] = [];
  for (const item of Array.from(event.clipboardData.items ?? [])) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  return files;
}

export default function NewTicketDialog() {
  const { t } = useTranslation();
  const { open, setOpen, closeDialog } = useNewTicketDialogStore();
  const { openArticle } = useKnowledgeBaseNavigation();
  const openTicket = useTicketDetailDialogStore((state) => state.openTicket);
  const { showErrorSnack, showSuccessSnack } = useAlertStore();
  const { profile } = useUserStore();
  const { trigger, isMutating } = useCreateTicket();
  const { priorities } = useListPriorities();
  const needsSector = !profile?.sectorId;
  const { sectors } = useListSectors(needsSector);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [externalId, setExternalId] = useState('');
  const [priorityId, setPriorityId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirmNoAttachmentOpen, setConfirmNoAttachmentOpen] = useState(false);

  const priorityOptions = useMemo(
    () => [
      { value: '', label: t('tickets.priorityDefault'), code: null },
      ...priorities.map((priority) => ({
        value: priority.id,
        label: priority.label,
        code: priority.code,
      })),
    ],
    [priorities, t],
  );

  const sectorOptions = useMemo(
    () =>
      sectors.map((sector) => ({
        value: sector.id,
        label: sector.name,
      })),
    [sectors],
  );

  const resetForm = () => {
    setAttachments((current) => {
      current.forEach((item) => {
        if (item.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      return [];
    });
    setSubject('');
    setDescription('');
    setExternalId('');
    setPriorityId('');
    setSectorId('');
    setUploading(false);
    setDragging(false);
    setConfirmNoAttachmentOpen(false);
  };

  const canSubmit =
    !isMutating &&
    !uploading &&
    subject.trim().length >= 3 &&
    stripHtmlToText(description).length >= 3 &&
    (!needsSector || Boolean(sectorId));

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploaded: PendingAttachment[] = [];
      for (const file of files) {
        const localPreview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
        const result = await uploadTicketAttachment(file);
        uploaded.push({
          localId: `${result.key}-${Date.now()}-${Math.random()}`,
          key: result.key,
          originalFilename: result.originalFilename,
          contentType: result.contentType,
          size: result.size,
          previewUrl: localPreview || (isImageContentType(result.contentType) ? result.url : undefined),
        });
      }
      setAttachments((current) => [...current, ...uploaded]);
    } catch (error: unknown) {
      showErrorSnack(getApiErrorMessage(error, t('tickets.attachmentUploadError')));
    } finally {
      setUploading(false);
    }
  };

  const onPickFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    await uploadFiles(files);
  };

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (uploading) return;
    const files = Array.from(event.dataTransfer.files ?? []);
    await uploadFiles(files);
  };

  const onPaste = async (event: ClipboardEvent<HTMLDivElement>) => {
    if (uploading) return;
    const files = filesFromClipboard(event);
    if (files.length === 0) return;
    event.preventDefault();
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

  const createTicket = async () => {
    try {
      const result = await trigger({
        subject,
        description,
        externalId: externalId.trim() || undefined,
        priorityId: priorityId || undefined,
        sectorId: needsSector ? sectorId || undefined : undefined,
        attachments: attachments.map(({ key, originalFilename, contentType, size }) => ({
          key,
          originalFilename,
          contentType,
          size,
        })),
      });
      showSuccessSnack(t('tickets.created'));
      resetForm();
      closeDialog();
      openTicket(result.data.id);
    } catch (error: unknown) {
      showErrorSnack(getApiErrorMessage(error, t('tickets.createError')));
    }
  };

  const onSubmit = async () => {
    if (!canSubmit) return;

    if (attachments.length === 0) {
      setConfirmNoAttachmentOpen(true);
      return;
    }

    await createTicket();
  };

  const onConfirmSendWithoutAttachment = async () => {
    setConfirmNoAttachmentOpen(false);
    if (!canSubmit) return;
    await createTicket();
  };

  const onBackToAttach = () => {
    setConfirmNoAttachmentOpen(false);
    requestAnimationFrame(() => {
      dropzoneRef.current?.focus();
    });
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetForm();
        }}
      >
        <DialogContent
          className="flex h-[min(94vh,52rem)] w-[min(96vw,56rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:rounded-xl"
          aria-describedby={undefined}
        >
          <NewTicketForm
            key={String(open)}
            values={{ subject, description, externalId, priorityId, sectorId }}
            onValidSubmit={onSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5 pr-12">
              <div className="min-w-0 space-y-1">
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {t('tickets.newTitle')}
                </DialogTitle>
                <DialogDescription className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {t('tickets.newSubtitle')}
                </DialogDescription>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="mx-auto flex max-w-4xl flex-col gap-5">
                {needsSector ? (
                  <FieldBlock
                    label={t('tickets.sector')}
                    hint={t('tickets.sectorHint')}
                    required
                    htmlFor="new-ticket-sector"
                  >
                    <SelectField
                      id="new-ticket-sector"
                      value={sectorId}
                      onValueChange={setSectorId}
                      options={sectorOptions}
                      placeholder={t('tickets.sectorPlaceholder')}
                      required
                      aria-label={t('tickets.sector')}
                    />
                  </FieldBlock>
                ) : null}

                <FieldBlock
                  label={t('tickets.priority')}
                  hint={t('tickets.priorityHint')}
                  htmlFor="new-ticket-priority"
                >
                  <div className="flex min-w-0 items-center gap-1">
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
                      <Flag className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <TicketPrioritySelect
                        value={priorityId}
                        onValueChange={setPriorityId}
                        options={priorityOptions}
                        placeholder={t('tickets.priorityDefault')}
                        aria-label={t('tickets.priority')}
                        className="min-w-0 flex-1"
                      />
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-muted-foreground"
                          aria-label={t('tickets.priorityGuideLink')}
                          onClick={() => openArticle(KNOWLEDGE_BASE_PRIORITY_GUIDE_SLUG)}
                        >
                          <CircleHelp className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('tickets.priorityGuideLink')}</TooltipContent>
                    </Tooltip>
                  </div>
                </FieldBlock>

                <FieldBlock
                  label={t('tickets.subject')}
                  hint={t('tickets.subjectHint')}
                  required
                  htmlFor="new-ticket-subject"
                >
                  <Input
                    id="new-ticket-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    minLength={3}
                    placeholder={t('tickets.subjectPlaceholder')}
                    className="h-10 shadow-none"
                  />
                </FieldBlock>

                <FieldBlock
                  label={t('tickets.description')}
                  hint={t('tickets.descriptionHint')}
                  required
                  htmlFor="new-ticket-description"
                >
                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    enableMedia={false}
                    enableMentions
                    placeholder={t('tickets.descriptionPlaceholder')}
                    className="min-h-[10rem]"
                  />
                </FieldBlock>

                <TicketKnowledgeSuggestions
                  subject={subject}
                  description={description}
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <FieldBlock
                    label={t('tickets.externalId')}
                    hint={t('tickets.externalIdHint')}
                    htmlFor="new-ticket-external-id"
                  >
                    <Input
                      id="new-ticket-external-id"
                      value={externalId}
                      onChange={(e) => setExternalId(e.target.value)}
                      maxLength={200}
                      placeholder={t('tickets.externalIdPlaceholder')}
                      className="h-10 shadow-none"
                    />
                  </FieldBlock>

                  <FieldBlock
                    label={t('tickets.attachments')}
                    hint={t('tickets.attachmentHint')}
                    recommendedLabel={t('tickets.attachmentRecommended')}
                  >
                    <div
                      ref={dropzoneRef}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      onPaste={onPaste}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setDragging(true);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={(event) => {
                        event.preventDefault();
                        setDragging(false);
                      }}
                      onDrop={onDrop}
                      className={cn(
                        'flex min-h-[7.5rem] cursor-pointer flex-col rounded-md border border-dashed px-3 py-3 transition-colors',
                        attachments.length === 0
                          ? 'items-center justify-center px-4 py-5 text-center'
                          : 'gap-2',
                        dragging
                          ? 'border-primary bg-primary/5'
                          : 'border-input bg-muted/20 hover:border-primary/40 hover:bg-muted/30',
                        uploading && 'pointer-events-none opacity-70',
                      )}
                    >
                      {attachments.length > 0 ? (
                        <ul className="grid w-full gap-2">
                          {attachments.map((item) => (
                            <li
                              key={item.localId}
                              className="flex min-w-0 items-center gap-3 rounded-md border border-border bg-card px-2.5 py-2"
                            >
                              {item.previewUrl && isImageContentType(item.contentType) ? (
                                <img
                                  src={item.previewUrl}
                                  alt=""
                                  className="h-12 w-12 shrink-0 rounded-md object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                  <FileTypeIcon contentType={item.contentType} />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {item.originalFilename}
                                </p>
                                <p className="text-[11px] tabular-nums text-muted-foreground">
                                  {formatFileSize(item.size)}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeAttachment(item.localId);
                                }}
                                aria-label={t('tickets.attachmentRemove')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div
                        className={cn(
                          'space-y-1 text-sm text-muted-foreground',
                          attachments.length > 0 && 'text-center',
                        )}
                      >
                        <p>
                          {uploading ? (
                            t('tickets.attachmentUploading')
                          ) : (
                            <>
                              {t('tickets.attachmentDropPrefix')}{' '}
                              <span className="font-medium text-primary">
                                {t('tickets.attachmentDropAction')}
                              </span>
                            </>
                          )}
                        </p>
                        {!uploading ? (
                          <p className="text-xs text-muted-foreground/90">
                            {t('tickets.attachmentPasteHint')}
                          </p>
                        ) : null}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        accept="image/*,video/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.zip"
                        onChange={onPickFiles}
                      />
                    </div>
                  </FieldBlock>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-border bg-card px-6 py-4">
              <div className="mx-auto max-w-4xl">
                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full text-sm font-semibold shadow-none"
                  disabled={!canSubmit}
                >
                  {t('tickets.submit')}
                </Button>
              </div>
            </div>
          </NewTicketForm>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmNoAttachmentOpen} onOpenChange={setConfirmNoAttachmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tickets.attachmentConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('tickets.attachmentConfirmDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onBackToAttach}>
              {t('tickets.attachmentConfirmBack')}
            </Button>
            <Button
              type="button"
              onClick={onConfirmSendWithoutAttachment}
              disabled={!canSubmit}
              autoFocus
            >
              {t('tickets.attachmentConfirmSend')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
