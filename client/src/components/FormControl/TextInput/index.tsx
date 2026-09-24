import { ReactNode } from "react";
import { Control, Controller, FieldError, FieldErrorsImpl, Merge } from "react-hook-form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

interface Props {
  control: Control<any>;
  fieldError: FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined;
  name: string;
  defaultValue?: string;
  label: string;
  className?: string;
  type?: string;
  autoComplete?: string;
}

export default function TextInput({
  name,
  defaultValue,
  label,
  control,
  fieldError,
  className,
  type = 'text',
  autoComplete,
}: Props) {
  return (
    <div className={cn("flex-1 pt-4", className)}>
      <Controller
        name={name}
        control={control}
        {...(defaultValue !== undefined ? { defaultValue } : {})}
        render={({ field: { ref, ...field } }) => (
          <div className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <Input
              {...field}
              id={name}
              type={type}
              autoComplete={autoComplete}
              ref={ref}
              aria-invalid={Boolean(fieldError)}
            />
            {fieldError?.message && (
              <p className="text-sm text-destructive">{fieldError.message as ReactNode}</p>
            )}
          </div>
        )}
      />
    </div>
  );
}
