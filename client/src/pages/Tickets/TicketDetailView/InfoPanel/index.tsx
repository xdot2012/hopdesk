import {
  CalendarClock,
  CircleDot,
  Flag,
  Hash,
  Paperclip,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TicketDetail } from '~/api/ticket/types';
import AuthenticatedAvatarImage from '~/components/AuthenticatedAvatarImage';
import AuthenticatedImage from '~/components/AuthenticatedImage';
import RichTextViewer from '~/components/RichTextViewer';
import {
  TicketPriorityBadge,
  TicketSlaBadge,
  TicketStatusBadge,
} from '~/components/TicketBadges';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import { openAuthenticatedFile } from '~/lib/authenticatedFiles';
import { getFileTypeIcon, isImageContentType } from '~/lib/fileVisuals';
import TicketKnowledgeSuggestions from '~/pages/Tickets/TicketKnowledgeSuggestions';
import TicketMetaField from '~/pages/Tickets/TicketMetaField';
import TicketSatisfactionPanel from '~/pages/Tickets/TicketSatisfactionPanel';
import AssigneeField from '../AssigneeField';
import { FINISHED_STATUSES } from '../constants';
import { initials } from '../helpers';

type InfoPanelProps = {
  ticket: TicketDetail;
  agent: boolean;
  currentUserId?: string | null;
  formatTime: (value: string) => string;
  showSlaCountdown: boolean;
  slaCountdownOverdue: boolean;
  slaMinuteDelta: { overdue: boolean; minutes: number } | null;
  activeSlaDueAt: string | null | undefined;
  assigning: boolean;
  updatingTicket: boolean;
  canRateSatisfaction: boolean;
  showSatisfactionView: boolean;
  onAssigneeChange: (nextAssigneeId: string) => void;
  onAssignToMe: () => void;
  onRated: () => Promise<void>;
};

export default function InfoPanel({
  ticket,
  agent,
  currentUserId,
  formatTime,
  showSlaCountdown,
  slaCountdownOverdue,
  slaMinuteDelta,
  activeSlaDueAt,
  assigning,
  updatingTicket,
  canRateSatisfaction,
  showSatisfactionView,
  onAssigneeChange,
  onAssignToMe,
  onRated,
}: InfoPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-0 flex-col overflow-y-auto border-b border-border lg:border-b-0 lg:border-r">
      <div className="shrink-0 space-y-3 px-5 pt-4">
        <div className="flex flex-col gap-2">
          <TicketMetaField icon={UserRound} label={t('tickets.requester')}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex min-w-0 items-center gap-1.5">
                  <Avatar className="h-6 w-6 shrink-0">
                    {ticket.requesterAvatarUrl ? (
                      <AuthenticatedAvatarImage
                        src={ticket.requesterAvatarUrl}
                        alt={ticket.requesterName || ticket.requesterEmail || ''}
                      />
                    ) : null}
                    <AvatarFallback className="bg-muted text-[9px]">
                      {initials(ticket.requesterName || ticket.requesterEmail)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-xs text-foreground">
                    {ticket.requesterName || ticket.requesterEmail}
                  </span>
                </div>
              </TooltipTrigger>
              {(ticket.requesterEmail || ticket.requesterName) && (
                <TooltipContent>
                  {ticket.requesterEmail || ticket.requesterName}
                </TooltipContent>
              )}
            </Tooltip>
          </TicketMetaField>

          {agent ? (
            <AssigneeField
              ticket={ticket}
              currentUserId={currentUserId}
              assigning={assigning}
              updatingTicket={updatingTicket}
              onAssigneeChange={onAssigneeChange}
              onAssignToMe={onAssignToMe}
            />
          ) : null}

          <TicketMetaField icon={CircleDot} label={t('tickets.statusLabel')}>
            <div className="flex flex-wrap items-center gap-1.5">
              <TicketStatusBadge status={ticket.status} />
              {ticket.awaitingCustomerReply ? (
                <Badge variant="soft" className="ticket-status-waiting">
                  {t('tickets.awaitingCustomerReply')}
                </Badge>
              ) : null}
            </div>
          </TicketMetaField>

          <TicketMetaField icon={Flag} label={t('tickets.priority')}>
            <TicketPriorityBadge
              code={ticket.priorityCode}
              label={ticket.priorityLabel}
            />
          </TicketMetaField>

          <TicketMetaField icon={Hash} label={t('tickets.externalId')}>
            {ticket.externalId?.trim() ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block truncate text-xs font-medium tabular-nums text-foreground">
                    #{ticket.externalId.trim()}
                  </span>
                </TooltipTrigger>
                <TooltipContent>#{ticket.externalId.trim()}</TooltipContent>
              </Tooltip>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </TicketMetaField>

          <TicketMetaField icon={CalendarClock} label={t('tickets.columns.createdAt')}>
            <time className="text-xs tabular-nums text-foreground" dateTime={ticket.createdAt}>
              {formatTime(ticket.createdAt)}
            </time>
          </TicketMetaField>

          {agent && ticket.slaStatus ? (
            <TicketMetaField
              icon={ShieldAlert}
              label={t('tickets.columns.sla')}
            >
              {showSlaCountdown && slaMinuteDelta ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <TicketSlaBadge
                        status={ticket.slaStatus}
                        firstRespondedAt={ticket.firstRespondedAt}
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {slaCountdownOverdue
                      ? t('tickets.slaOverdueMinutes', { count: slaMinuteDelta.minutes })
                      : t('tickets.slaRemainingMinutes', { count: slaMinuteDelta.minutes })}
                    {activeSlaDueAt ? ` · ${formatTime(activeSlaDueAt)}` : null}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <TicketSlaBadge
                  status={ticket.slaStatus}
                  firstRespondedAt={ticket.firstRespondedAt}
                />
              )}
            </TicketMetaField>
          ) : null}
        </div>

        <Separator />
      </div>

      <section
        className="shrink-0 space-y-4 px-5 pb-4 pt-3"
        aria-label={t('tickets.description')}
      >
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            {t('tickets.description')}
          </h3>
          <RichTextViewer html={ticket.description} className="text-foreground/90" />
        </div>

        {!FINISHED_STATUSES.has(ticket.status) ? (
          <TicketKnowledgeSuggestions ticketId={ticket.id} />
        ) : null}

        {ticket.status === 'closed' &&
        (ticket.cause || ticket.solution || ticket.effortMinutes) ? (
          <div className="space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              {t('tickets.resolutionSummary')}
            </h3>
            {ticket.cause ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('tickets.board.close.causeLabel')}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {ticket.cause}
                </p>
              </div>
            ) : null}
            {ticket.solution ? (
              <div className="space-y-1.5 border-t border-primary/15 pt-4">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('tickets.board.close.solutionLabel')}
                  </p>
                  {ticket.solutionInternal ? (
                    <Badge variant="soft" className="text-[10px]">
                      {t('tickets.board.close.internalLabel')}
                    </Badge>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {ticket.solution}
                </p>
              </div>
            ) : null}
            {ticket.effortMinutes != null && ticket.effortMinutes > 0 ? (
              <div className="space-y-1.5 border-t border-primary/15 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('tickets.board.close.effortLabel')}
                </p>
                <p className="text-sm tabular-nums text-foreground">
                  {t('tickets.board.close.effortOption', {
                    minutes: ticket.effortMinutes,
                  })}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {canRateSatisfaction ? (
          <TicketSatisfactionPanel ticket={ticket} mode="rate" onRated={onRated} />
        ) : null}

        {showSatisfactionView ? (
          <TicketSatisfactionPanel ticket={ticket} mode="view" />
        ) : null}

        {ticket.attachments && ticket.attachments.length > 0 ? (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              {t('tickets.attachments')}
            </h3>
            <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
              {ticket.attachments.map((attachment) => {
                const TypeIcon = getFileTypeIcon(attachment.contentType);
                const fileRef = attachment.url || attachment.fileKey;
                const isImage =
                  isImageContentType(attachment.contentType) && Boolean(fileRef);

                return (
                  <li key={attachment.id} className="shrink-0">
                    <button
                      type="button"
                      title={attachment.originalFilename}
                      aria-label={t('tickets.openAttachment')}
                      className="group flex w-[6.5rem] flex-col gap-1.5 text-left"
                      onClick={() => {
                        if (!fileRef) return;
                        void openAuthenticatedFile(fileRef);
                      }}
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted/30 transition-colors group-hover:border-primary/40 group-hover:bg-muted/50">
                        {isImage ? (
                          <AuthenticatedImage
                            src={fileRef}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-2 text-muted-foreground">
                            <TypeIcon className="h-7 w-7" />
                          </div>
                        )}
                      </div>
                      <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight text-foreground/90">
                        {attachment.originalFilename}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
