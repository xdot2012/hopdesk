import { ChevronDown } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { cn } from '~/lib/utils';

export type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  size?: 'default' | 'sm';
  'aria-label'?: string;
};

export default function SelectField({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  required,
  className,
  size = 'default',
  'aria-label': ariaLabel,
}: Props) {
  const selected = options.find((option) => option.value === value);
  const compact = size === 'sm';

  return (
    <div className={cn('w-full', className)}>
      {required && (
        <input
          id={id}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          value={value}
          onChange={() => undefined}
          required
        />
      )}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button
            type="button"
            variant="outline"
            id={required ? undefined : id}
            aria-label={ariaLabel}
            className={cn(
              'w-full justify-between font-normal shadow-none',
              compact ? 'h-8 px-2.5 text-xs' : 'h-10 px-3',
              !selected && 'text-muted-foreground',
            )}
          >
            <span className="truncate">{selected?.label ?? placeholder}</span>
            <ChevronDown className={cn('shrink-0 opacity-60', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value || '__empty'}
              onSelect={() => onValueChange(option.value)}
              className={cn(option.value === value && 'bg-accent')}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
