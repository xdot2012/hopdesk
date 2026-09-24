import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '~/lib/utils';

type TicketMetaFieldProps = {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
};

/** Compact metadata row: icon + label on the left, value on the right. */
export default function TicketMetaField({
  icon: Icon,
  label,
  children,
  className,
}: TicketMetaFieldProps) {
  return (
    <div className={cn('flex min-w-0 items-start gap-2', className)}>
      <div className="flex w-[8.25rem] shrink-0 items-center gap-1.5 pt-0.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
