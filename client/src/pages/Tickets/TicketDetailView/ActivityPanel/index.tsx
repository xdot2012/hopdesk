import { Ban } from 'lucide-react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import type { TicketMessage } from '~/api/ticket/types';
import { Button } from '~/components/ui/button';
import ActivityMessage from '../ActivityMessage';
import ReplyForm from '../ReplyForm';

type ActivityPanelProps = {
  ticketId: string;
  messages: TicketMessage[];
  requesterUserId: string;
  currentUserId?: string | null;
  agent: boolean;
  canCancelTicket: boolean;
  cancelling: boolean;
  formatTime: (value: string) => string;
  editingMessageId: string | null;
  editBody: string;
  updatingMessage: boolean;
  deletingMessage: boolean;
  activityEndRef: RefObject<HTMLDivElement | null>;
  onCancelClick: () => void;
  onEditBodyChange: (value: string) => void;
  onStartEdit: (messageId: string, currentBody: string) => void;
  onCancelEdit: () => void;
  onSaveMessage: (messageId: string) => void;
  onRequestDelete: (messageId: string) => void;
  onSent: () => Promise<unknown>;
};

export default function ActivityPanel({
  ticketId,
  messages,
  requesterUserId,
  currentUserId,
  agent,
  canCancelTicket,
  cancelling,
  formatTime,
  editingMessageId,
  editBody,
  updatingMessage,
  deletingMessage,
  activityEndRef,
  onCancelClick,
  onEditBodyChange,
  onStartEdit,
  onCancelEdit,
  onSaveMessage,
  onRequestDelete,
  onSent,
}: ActivityPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-0 flex-col bg-muted/15">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3.5">
        <div className="min-w-0 flex flex-col justify-center gap-0.5">
          <h3 className="text-sm font-semibold text-foreground">{t('tickets.activity')}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {t('tickets.activitySubtitle')}
          </p>
        </div>
        {canCancelTicket ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onCancelClick}
            disabled={cancelling}
          >
            <Ban className="h-3.5 w-3.5" aria-hidden />
            {t('tickets.cancelByRequester.action')}
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card/60 px-3 py-4 text-center text-xs text-muted-foreground">
            {t('tickets.noMessagesYet')}
          </p>
        ) : null}

        {messages.map((message) => (
          <ActivityMessage
            key={message.id}
            message={message}
            requesterUserId={requesterUserId}
            currentUserId={currentUserId}
            formatTime={formatTime}
            isEditing={editingMessageId === message.id}
            editBody={editBody}
            updatingMessage={updatingMessage}
            deletingMessage={deletingMessage}
            onEditBodyChange={onEditBodyChange}
            onStartEdit={onStartEdit}
            onCancelEdit={onCancelEdit}
            onSave={onSaveMessage}
            onRequestDelete={onRequestDelete}
          />
        ))}
        <div ref={activityEndRef} />
      </div>

      <ReplyForm key={ticketId} ticketId={ticketId} agent={agent} onSent={onSent} />
    </div>
  );
}
