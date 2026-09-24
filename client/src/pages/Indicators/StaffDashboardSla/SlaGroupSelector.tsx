import { useTranslation } from 'react-i18next';
import type { TicketStatsGroup } from '~/api/ticket/getTicketStats';
import { cn } from '~/lib/utils';

type Props = {
  value: TicketStatsGroup;
  onChange: (next: TicketStatsGroup) => void;
};

export default function SlaGroupSelector({ value, onChange }: Props) {
  const { t } = useTranslation();
  const options: TicketStatsGroup[] = [
    'overall',
    'priority',
    'requester',
    'agent',
    'sector',
  ];

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-1"
      role="tablist"
      aria-label={t('dashboard.sla.groupAriaLabel')}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={value === option}
          onClick={() => onChange(option)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:text-sm',
            value === option
              ? 'bg-primary text-primary-foreground'
              : 'text-primary hover:bg-primary/10',
          )}
        >
          {t(`dashboard.sla.groups.${option}`)}
        </button>
      ))}
    </div>
  );
}
