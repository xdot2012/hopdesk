import { ChevronDown } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { cn } from '~/lib/utils';
import type { SelectOption } from '~/components/SelectField';

type Props = {
  id?: string;
  values: string[];
  onValuesChange: (values: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Rótulo quando nenhum item está selecionado (ex.: "Todos os setores"). */
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  size?: 'default' | 'sm';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  'aria-label'?: string;
};

function formatSelectedLabel(
  values: string[],
  options: SelectOption[],
  emptyLabel?: string,
  placeholder?: string,
) {
  if (values.length === 0) {
    return emptyLabel ?? placeholder ?? '';
  }

  const labels = values
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) {
    return emptyLabel ?? placeholder ?? '';
  }

  return labels.join(', ');
}

export default function MultiSelectField({
  id,
  values,
  onValuesChange,
  options,
  placeholder,
  emptyLabel,
  disabled,
  className,
  size = 'default',
  open,
  onOpenChange,
  'aria-label': ariaLabel,
}: Props) {
  const compact = size === 'sm';
  const label = formatSelectedLabel(values, options, emptyLabel, placeholder);
  const showMuted = values.length === 0;

  const toggleValue = (value: string, checked: boolean) => {
    if (checked) {
      onValuesChange([...values, value]);
      return;
    }
    onValuesChange(values.filter((item) => item !== value));
  };

  return (
    <div className={cn('w-full', className)}>
      <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild disabled={disabled || options.length === 0}>
          <Button
            type="button"
            variant="outline"
            id={id}
            aria-label={ariaLabel}
            className={cn(
              'w-full justify-between font-normal shadow-none',
              compact ? 'h-8 px-2.5 text-xs' : 'h-10 px-3',
              showMuted && 'text-muted-foreground',
            )}
          >
            <span className="truncate">{label || placeholder}</span>
            <ChevronDown
              className={cn('shrink-0 opacity-60', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          {emptyLabel ? (
            <>
              <DropdownMenuCheckboxItem
                checked={values.length === 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onValuesChange([]);
                  }
                }}
                onSelect={(event) => event.preventDefault()}
              >
                {emptyLabel}
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={values.includes(option.value)}
              onCheckedChange={(checked) => toggleValue(option.value, checked === true)}
              onSelect={(event) => event.preventDefault()}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export type { SelectOption };
