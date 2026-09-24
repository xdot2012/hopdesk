import { AlertTriangle, CheckCircle2, Clock3, Pause } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '~/components/ui/badge';
import { ticketSlaClass } from '~/lib/ticketVisuals';
import { cn } from '~/lib/utils';

type SlaBadgeProps = {
  status?: string | null;
  firstRespondedAt?: string | null;
  className?: string;
};

export default function TicketSlaBadge({ status, firstRespondedAt, className }: SlaBadgeProps) {
  const { t } = useTranslation();
  if (!status) return <span className="text-muted-foreground">—</span>;

  const label =
    status === 'due'
      ? String(
          t(
            firstRespondedAt
              ? 'tickets.slaPhase.resolution'
              : 'tickets.slaPhase.firstResponse',
          ),
        )
      : String(t(`tickets.slaStatus.${status}`, { defaultValue: status }));

  return (
    <Badge
      variant="soft"
      className={cn(ticketSlaClass(status), className)}
      aria-label={`${t('tickets.columns.sla')}: ${label}`}
    >
      {status === 'failed' ? (
        <AlertTriangle className="mr-1 h-3 w-3 shrink-0" aria-hidden />
      ) : status === 'paused' ? (
        <Pause className="mr-1 h-3 w-3 shrink-0" aria-hidden />
      ) : status === 'fulfilled' ? (
        <CheckCircle2 className="mr-1 h-3 w-3 shrink-0" aria-hidden />
      ) : (
        <Clock3 className="mr-1 h-3 w-3 shrink-0" aria-hidden />
      )}
      {label}
    </Badge>
  );
}
