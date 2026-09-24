import { useTranslation } from 'react-i18next';
import { Badge } from '~/components/ui/badge';
import { ticketStatusClass } from '~/lib/ticketVisuals';
import { cn } from '~/lib/utils';
import StatusIcon from './StatusIcon';

type StatusBadgeProps = {
  status: string;
  className?: string;
  showIcon?: boolean;
};

export default function TicketStatusBadge({
  status,
  className,
  showIcon = true,
}: StatusBadgeProps) {
  const { t } = useTranslation();
  const label = String(t(`tickets.status.${status}`, { defaultValue: status }));

  return (
    <Badge
      variant="soft"
      className={cn(ticketStatusClass(status), className)}
      aria-label={`${t('tickets.columns.status')}: ${label}`}
    >
      {showIcon ? <StatusIcon status={status} /> : null}
      {label}
    </Badge>
  );
}
