import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '~/components/ui/badge';
import { ticketPriorityClass } from '~/lib/ticketVisuals';
import { cn } from '~/lib/utils';

type PriorityBadgeProps = {
  code?: string | null;
  label?: string | null;
  className?: string;
};

export default function TicketPriorityBadge({ code, label, className }: PriorityBadgeProps) {
  const { t } = useTranslation();
  const display =
    label?.trim() ||
    (code ? String(t(`tickets.priorityCode.${code}`, { defaultValue: code })) : null);
  if (!display) return <span className="text-muted-foreground">—</span>;

  return (
    <Badge
      variant="soft"
      className={cn(ticketPriorityClass(code), className)}
      aria-label={`${t('tickets.columns.priority')}: ${display}`}
    >
      {code === 'urgent' || code === 'high' ? (
        <AlertTriangle className="mr-1 h-3 w-3 shrink-0" aria-hidden />
      ) : null}
      {display}
    </Badge>
  );
}
