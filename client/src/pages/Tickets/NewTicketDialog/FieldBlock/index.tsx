import type { ReactNode } from 'react';
import { Label } from '~/components/ui/label';
import { cn } from '~/lib/utils';

type Props = {
  label: string;
  hint?: string;
  required?: boolean;
  recommendedLabel?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
};

export default function FieldBlock({
  label,
  hint,
  required,
  recommendedLabel,
  htmlFor,
  children,
  className,
}: Props) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="space-y-0.5">
        <Label
          htmlFor={htmlFor}
          className="text-sm font-semibold text-foreground"
        >
          {label}
          {required ? (
            <span className="ml-0.5 text-destructive">*</span>
          ) : null}
          {recommendedLabel && !required ? (
            <span className="ml-1.5 text-xs font-medium text-primary">
              {recommendedLabel}
            </span>
          ) : null}
        </Label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}
