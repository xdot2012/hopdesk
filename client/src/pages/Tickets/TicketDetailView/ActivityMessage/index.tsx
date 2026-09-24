import { ArrowRight, CircleDot, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TicketMessage } from '~/api/ticket/types';
import AuthenticatedAvatarImage from '~/components/AuthenticatedAvatarImage';
import RichTextEditor from '~/components/RichTextEditor';
import RichTextViewer from '~/components/RichTextViewer';
import { TicketStatusBadge } from '~/components/TicketBadges';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { isRichTextEmpty } from '~/lib/richText';
import {
  isSystemActivityMessage,
  isTicketOpenedMessage,
  parseAssigneeChangeMessage,
  parseStatusChangeMessage,
} from '~/lib/ticketMessages';
import { cn } from '~/lib/utils';
import MessageAttachments from '../MessageAttachments';
import { initials } from '../helpers';

type ActivityMessageProps = {
  message: TicketMessage;
  requesterUserId: string;
  currentUserId?: string | null;
  formatTime: (value: string) => string;
  isEditing: boolean;
  editBody: string;
  updatingMessage: boolean;
  deletingMessage: boolean;
  onEditBodyChange: (value: string) => void;
  onStartEdit: (messageId: string, currentBody: string) => void;
  onCancelEdit: () => void;
  onSave: (messageId: string) => void;
  onRequestDelete: (messageId: string) => void;
};

export default function ActivityMessage({
  message,
  requesterUserId,
  currentUserId,
  formatTime,
  isEditing,
  editBody,
  updatingMessage,
  deletingMessage,
  onEditBodyChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  onRequestDelete,
}: ActivityMessageProps) {
  const { t } = useTranslation();

  const isInternal = message.visibility === 'internal';
  const statusChange = parseStatusChangeMessage(message.body);
  const assigneeChange = parseAssigneeChangeMessage(message.body);
  const ticketOpened = isTicketOpenedMessage(message.body);
  const isSystemEvent =
    Boolean(statusChange) ||
    Boolean(assigneeChange) ||
    ticketOpened ||
    isSystemActivityMessage(message.body);
  const isRequester = message.authorUserId === requesterUserId;
  const isOwn = Boolean(currentUserId && message.authorUserId === currentUserId);
  const wasEdited =
    Boolean(message.updatedAt) &&
    new Date(message.updatedAt).getTime() - new Date(message.createdAt).getTime() > 1000;

  if (statusChange) {
    return (
      <article className="flex items-center gap-2 rounded-md px-1 py-1.5">
        <Avatar className="h-5 w-5 shrink-0">
          {message.authorAvatarUrl ? (
            <AuthenticatedAvatarImage
              src={message.authorAvatarUrl}
              alt={message.authorName || ''}
            />
          ) : null}
          <AvatarFallback className="bg-muted text-[8px] text-muted-foreground">
            {initials(message.authorName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <TicketStatusBadge status={statusChange.fromStatus} className="text-[10px]" />
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
          <TicketStatusBadge status={statusChange.toStatus} className="text-[10px]" />
          <span className="truncate text-[10px] text-muted-foreground">
            · {message.authorName || t('common.user')}
          </span>
          <time
            className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground"
            dateTime={message.createdAt}
          >
            {formatTime(message.createdAt)}
          </time>
        </div>
      </article>
    );
  }

  if (ticketOpened || assigneeChange) {
    const activityLabel = ticketOpened
      ? t('tickets.activityCreated')
      : t('tickets.activityAssigneeAssigned', {
          name: assigneeChange?.assigneeName || t('common.user'),
        });

    return (
      <article className="flex items-center gap-2 rounded-md px-1 py-1.5">
        <Avatar className="h-5 w-5 shrink-0">
          {message.authorAvatarUrl ? (
            <AuthenticatedAvatarImage
              src={message.authorAvatarUrl}
              alt={message.authorName || ''}
            />
          ) : null}
          <AvatarFallback className="bg-muted text-[8px] text-muted-foreground">
            {initials(message.authorName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span className="truncate text-xs text-foreground">
            <span className="font-medium">{message.authorName || t('common.user')}</span>
            <span className="font-normal text-muted-foreground"> · {activityLabel}</span>
          </span>
          <time
            className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground"
            dateTime={message.createdAt}
          >
            {formatTime(message.createdAt)}
          </time>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'rounded-md border bg-card px-2.5 py-2',
        isSystemEvent
          ? 'border-border/70 bg-muted/40'
          : isInternal
            ? 'border-dashed border-[color-mix(in_oklch,var(--status-waiting-foreground)_35%,transparent)] bg-[color-mix(in_oklch,var(--status-waiting)_25%,transparent)]'
            : 'border-border',
      )}
    >
      <div className="mb-1 flex items-start gap-2">
        <Avatar className="mt-0.5 h-6 w-6">
          {message.authorAvatarUrl ? (
            <AuthenticatedAvatarImage
              src={message.authorAvatarUrl}
              alt={message.authorName || ''}
            />
          ) : null}
          <AvatarFallback
            className={cn(
              'text-[9px]',
              isSystemEvent
                ? 'bg-muted text-muted-foreground'
                : isRequester
                  ? 'bg-muted'
                  : 'bg-primary/15 text-primary',
            )}
          >
            {isSystemEvent ? (
              <CircleDot className="h-3 w-3" aria-hidden />
            ) : (
              initials(message.authorName)
            )}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">
                {message.authorName || t('common.user')}
                {message.customerPending ? (
                  <span className="ticket-status-waiting ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                    {t('tickets.customerPending')}
                  </span>
                ) : isInternal ? (
                  <span className="ticket-status-waiting ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                    {t('tickets.internalNote')}
                  </span>
                ) : !isRequester ? (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    · {t('tickets.agentReply')}
                  </span>
                ) : null}
              </p>
              <time
                className="mt-0.5 block text-[10px] tabular-nums text-muted-foreground"
                dateTime={message.createdAt}
              >
                {formatTime(message.createdAt)}
                {wasEdited ? (
                  <span className="ml-1 opacity-80">· {t('tickets.edited')}</span>
                ) : null}
              </time>
            </div>
            {isOwn && !isEditing && !isSystemEvent ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground"
                    aria-label={t('navbar.openMenu')}
                    disabled={updatingMessage || deletingMessage}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[8rem]">
                  <DropdownMenuItem
                    className="cursor-pointer gap-2"
                    onClick={() => onStartEdit(message.id, message.body)}
                    disabled={updatingMessage || deletingMessage}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('tickets.editMessage')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    onClick={() => onRequestDelete(message.id)}
                    disabled={updatingMessage || deletingMessage}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('tickets.deleteMessage')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          {isEditing ? (
            <div className="mt-1 space-y-2">
              <RichTextEditor
                value={editBody}
                onChange={onEditBodyChange}
                enableMedia={false}
                enableMentions
                compactToolbar
                placeholder={t('tickets.replyPlaceholder')}
              />
              <div className="flex justify-end gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={onCancelEdit}
                  disabled={updatingMessage}
                >
                  {t('tickets.cancelEdit')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => onSave(message.id)}
                  disabled={updatingMessage || isRichTextEmpty(editBody)}
                >
                  {t('tickets.saveMessage')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1">
              {!isRichTextEmpty(message.body) ? (
                <RichTextViewer
                  html={message.body}
                  className={cn('leading-snug', isSystemEvent && 'text-muted-foreground')}
                />
              ) : null}
              <MessageAttachments
                attachments={message.attachments || []}
                openLabel={t('tickets.openAttachment')}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
