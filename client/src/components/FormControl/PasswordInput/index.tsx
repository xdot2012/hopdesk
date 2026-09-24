import { Eye, EyeOff } from "lucide-react";
import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Control, Controller, FieldError, FieldErrorsImpl, Merge } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

interface Props {
  control: Control<any>;
  fieldError: FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined;
  name: string;
  defaultValue: string;
  label: string;
  className?: string;
  /** Use `current-password` on sign-in; `new-password` on sign-up / reset (triggers strong password suggestion). */
  autoComplete?: 'current-password' | 'new-password' | string;
}

export default function PasswordInput({
  name,
  defaultValue,
  label,
  control,
  fieldError,
  className,
  autoComplete = 'current-password',
}: Props) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={cn("flex-1 pt-4 w-full", className)}>
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue}
        render={({ field: { ref, ...field } }) => (
          <div className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <div className="relative">
              <Input
                {...field}
                id={name}
                type={showPassword ? "text" : "password"}
                autoComplete={autoComplete}
                ref={ref}
                aria-invalid={Boolean(fieldError)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-10 w-10"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
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
