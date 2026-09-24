import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { cn } from '~/lib/utils';
import TicketPriorityBadge from './TicketPriorityBadge';

type PrioritySelectOption = {
  value: string;
  label: string;
  code?: string | null;
};

type PrioritySelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: PrioritySelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
};

/** Priority picker that keeps the color-coded badge visible while editing. */
export default function TicketPrioritySelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  'aria-label': ariaLabel,
}: PrioritySelectProps) {
  const { t } = useTranslation();
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={ariaLabel}
          className={cn(
            'h-auto justify-start px-0 py-0 hover:bg-transparent hover:text-inherit',
            className,
          )}
        >
          {selected?.value ? (
            <TicketPriorityBadge code={selected.code} label={selected.label} />
          ) : (
            <span className="text-xs text-muted-foreground">
              {placeholder ?? t('tickets.priorityDefault')}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[12rem]">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value || '__empty'}
            onSelect={() => onValueChange(option.value)}
            className={cn('gap-2', option.value === value && 'bg-accent')}
          >
            {option.value ? (
              <TicketPriorityBadge code={option.code} label={option.label} />
            ) : (
              <span className="text-xs text-muted-foreground">{option.label}</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
