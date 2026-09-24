import { ReactNode } from "react";
import { Control, Controller, FieldError, FieldErrorsImpl, Merge } from "react-hook-form";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

interface Props {
  control: Control<any>;
  fieldError: FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined;
  name: string;
  defaultValue: boolean;
  label: string;
  className?: string;
}

export default function BooleanInput({ name, defaultValue, label, control, fieldError, className }: Props) {
  return (
    <div className={cn("flex-1 pt-4", className)}>
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue}
        render={({ field: { value, onChange, ...field } }) => (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={name}
                checked={value}
                onCheckedChange={onChange}
                {...field}
              />
              <Label htmlFor={name}>{label}</Label>
            </div>
            {fieldError?.message && (
              <p className="text-sm text-destructive">{fieldError.message as ReactNode}</p>
            )}
          </div>
        )}
      />
    </div>
  );
}
