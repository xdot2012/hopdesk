import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useAssignTicketToMe from '~/api/ticket/assignToMe';
import useCancelTicket from '~/api/ticket/cancelTicket';
import useDeleteTicketMessage from '~/api/ticket/deleteMessage';
import useGetTicket from '~/api/ticket/getTicket';
import markTicketViewed from '~/api/ticket/markTicketViewed';
import useUpdateTicket from '~/api/ticket/updateTicket';
import useUpdateTicketMessage from '~/api/ticket/updateMessage';
import { isRichTextEmpty } from '~/lib/richText';
import { cn } from '~/lib/utils';
import { useAlertStore, useUserStore } from '~/store';
import { getApiErrorMessage } from '~/util/functions';
import { isAgentRole, isCustomerRole } from '~/util/roles';
import ActivityPanel from './ActivityPanel';
import CancelTicketDialog from './CancelTicketDialog';
import { FINISHED_STATUSES } from './constants';
import DeleteMessageDialog from './DeleteMessageDialog';
import Header from './Header';
import { getActiveSlaDueAt, getSlaMinuteDelta } from './helpers';
import InfoPanel from './InfoPanel';

type TicketDetailViewProps = {
  ticketId: string;
  /** Compact layout for dialogs (fills modal height). */
  compact?: boolean;
};

export default function TicketDetailView({ ticketId, compact = false }: TicketDetailViewProps) {
  const { t, i18n } = useTranslation();
  const { profile } = useUserStore();
  const { showErrorSnack, showSuccessSnack } = useAlertStore();
  const agent = isAgentRole(profile?.role);
  const customer = isCustomerRole(profile?.role);
  const { ticket, mutate } = useGetTicket(ticketId);
  const { trigger: assignToMe, isMutating: assigning } = useAssignTicketToMe(ticketId);
  const { trigger: updateTicket, isMutating: updatingTicket } = useUpdateTicket(ticketId);
  const { trigger: cancelTicket, isMutating: cancelling } = useCancelTicket(ticketId);
  const { trigger: updateMessage, isMutating: updatingMessage } = useUpdateTicketMessage(ticketId);
  const { trigger: deleteMessage, isMutating: deletingMessage } = useDeleteTicketMessage(ticketId);
  const activityEndRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    void mutate();
  }, [ticketId, mutate]);

  useEffect(() => {
    if (!ticket?.id) return;
    void markTicketViewed(ticket.id).catch(() => {
      // ignore mark-viewed failures; list highlight stays until next successful open
    });
  }, [ticket?.id, ticket?.updatedAt]);

  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [ticket?.messages?.length, ticket?.id]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!ticket) {
    return <p className="p-4 text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  const formatTime = (value: string) =>
    new Date(value).toLocaleString(i18n.language, {
      dateStyle: 'short',
      timeStyle: 'short',
    });

  const activeSlaDueAt = getActiveSlaDueAt(ticket, nowMs);
  const slaMinuteDelta = activeSlaDueAt ? getSlaMinuteDelta(activeSlaDueAt, nowMs) : null;
  const showSlaCountdown =
    agent &&
    Boolean(activeSlaDueAt) &&
    ticket.slaStatus !== 'fulfilled' &&
    ticket.slaStatus !== 'paused';
  const slaCountdownOverdue =
    ticket.slaStatus === 'failed' || Boolean(slaMinuteDelta?.overdue);

  const onAssignToMe = async () => {
    try {
      await assignToMe({});
      await mutate();
      showSuccessSnack(t('tickets.assigned'));
    } catch (error: unknown) {
      showErrorSnack(getApiErrorMessage(error, t('tickets.updateError')));
    }
  };

  const onAssigneeChange = async (nextAssigneeId: string) => {
    if (!nextAssigneeId || nextAssigneeId === ticket.assigneeUserId) return;
    try {
      await updateTicket({ assigneeUserId: nextAssigneeId });
      await mutate();
      showSuccessSnack(t('tickets.assigneeUpdated'));
    } catch (error: unknown) {
      showErrorSnack(getApiErrorMessage(error, t('tickets.updateError')));
    }
  };

  const onCancelTicket = async () => {
    try {
      await cancelTicket({});
      setCancelConfirmOpen(false);
      await mutate();
      showSuccessSnack(t('tickets.cancelByRequester.success'));
    } catch (error: unknown) {
      showErrorSnack(getApiErrorMessage(error, t('tickets.cancelByRequester.error')));
    }
  };

  const startEditMessage = (messageId: string, currentBody: string) => {
    setEditingMessageId(messageId);
    setEditBody(currentBody);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditBody('');
  };

  const onSaveMessage = async (messageId: string) => {
    if (isRichTextEmpty(editBody)) return;
    try {
      await updateMessage({ messageId, body: editBody });
      cancelEditMessage();
      await mutate();
      showSuccessSnack(t('tickets.messageUpdated'));
    } catch (error: unknown) {
      showErrorSnack(getApiErrorMessage(error, t('tickets.messageUpdateError')));
    }
  };

  const onDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage({ messageId });
      if (editingMessageId === messageId) {
        cancelEditMessage();
      }
      setDeleteMessageId(null);
      await mutate();
      showSuccessSnack(t('tickets.messageDeleted'));
    } catch (error: unknown) {
      showErrorSnack(getApiErrorMessage(error, t('tickets.messageDeleteError')));
    }
  };

  const shellClass = cn(
    'flex min-h-0 flex-col overflow-hidden bg-card',
    compact ? 'h-full' : 'h-[calc(100vh-7.5rem)] rounded-xl border border-border shadow-sm',
  );

  const canCancelTicket =
    customer &&
    !FINISHED_STATUSES.has(ticket.status) &&
    (ticket.requesterUserId === profile?.id || Boolean(profile?.isSectorManager));

  const canRateSatisfaction =
    customer &&
    ticket.requesterUserId === profile?.id &&
    (ticket.status === 'testing' || ticket.status === 'closed') &&
    ticket.satisfactionRating == null;

  const showSatisfactionView = ticket.satisfactionRating != null;

  return (
    <>
      <div className={shellClass}>
        <Header number={ticket.number} subject={ticket.subject} />

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(16rem,2fr)_minmax(0,3fr)]">
          <InfoPanel
            ticket={ticket}
            agent={agent}
            currentUserId={profile?.id}
            formatTime={formatTime}
            showSlaCountdown={showSlaCountdown}
            slaCountdownOverdue={slaCountdownOverdue}
            slaMinuteDelta={slaMinuteDelta}
            activeSlaDueAt={activeSlaDueAt}
            assigning={assigning}
            updatingTicket={updatingTicket}
            canRateSatisfaction={canRateSatisfaction}
            showSatisfactionView={showSatisfactionView}
            onAssigneeChange={(next) => {
              void onAssigneeChange(next);
            }}
            onAssignToMe={() => {
              void onAssignToMe();
            }}
            onRated={async () => {
              await mutate();
            }}
          />

          <ActivityPanel
            ticketId={ticketId}
            messages={ticket.messages ?? []}
            requesterUserId={ticket.requesterUserId}
            currentUserId={profile?.id}
            agent={agent}
            canCancelTicket={canCancelTicket}
            cancelling={cancelling}
            formatTime={formatTime}
            editingMessageId={editingMessageId}
            editBody={editBody}
            updatingMessage={updatingMessage}
            deletingMessage={deletingMessage}
            activityEndRef={activityEndRef}
            onCancelClick={() => setCancelConfirmOpen(true)}
            onEditBodyChange={setEditBody}
            onStartEdit={startEditMessage}
            onCancelEdit={cancelEditMessage}
            onSaveMessage={(messageId) => {
              void onSaveMessage(messageId);
            }}
            onRequestDelete={setDeleteMessageId}
            onSent={mutate}
          />
        </div>
      </div>

      <DeleteMessageDialog
        messageId={deleteMessageId}
        deleting={deletingMessage}
        onClose={() => setDeleteMessageId(null)}
        onConfirm={(messageId) => {
          void onDeleteMessage(messageId);
        }}
      />

      <CancelTicketDialog
        open={cancelConfirmOpen}
        ticketNumber={ticket.number}
        ticketSubject={ticket.subject}
        cancelling={cancelling}
        onOpenChange={setCancelConfirmOpen}
        onConfirm={() => {
          void onCancelTicket();
        }}
      />
    </>
  );
}
