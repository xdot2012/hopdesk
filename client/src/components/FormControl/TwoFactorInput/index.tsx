import { ReactNode, useCallback, useRef } from "react";
import { Control, Controller, FieldError, FieldErrorsImpl, Merge } from "react-hook-form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

const DIGIT_COUNT = 6;

interface Props {
  control: Control<any>;
  fieldError: FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined;
  name: string;
  defaultValue: string;
  label: string;
  length?: number;
  className?: string;
}

export default function TwoFactorInput({
  name,
  defaultValue,
  label,
  control,
  fieldError,
  length = DIGIT_COUNT,
  className,
}: Props) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = useCallback((index: number) => {
    inputRefs.current[index]?.focus();
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent, startIndex: number, setValue: (value: string) => void) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      if (pasted.length > 0) {
        setValue(pasted);
        const next = Math.min(startIndex + pasted.length, length - 1);
        focusInput(next);
      }
    },
    [length, focusInput]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, index: number, value: string, setValue: (value: string) => void) => {
      if (e.key === "Backspace" && !value[index] && index > 0) {
        e.preventDefault();
        const next = value.slice(0, index - 1) + value.slice(index);
        setValue(next);
        focusInput(index - 1);
      }
    },
    [focusInput]
  );

  const handleChange = useCallback(
    (index: number, digit: string, current: string, setValue: (value: string) => void) => {
      const sanitized = digit.replace(/\D/g, "").slice(-1);
      const next = current.slice(0, index) + sanitized + current.slice(index + 1);
      setValue(next);
      if (sanitized && index < length - 1) {
        focusInput(index + 1);
      }
    },
    [length, focusInput]
  );

  return (
    <div className={cn("flex-1 pt-4", className)}>
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue}
        render={({ field: { ref, value = "", onChange, ...field } }) => {
          const digits = value.split("").concat(Array(length).fill("")).slice(0, length);
          const setValue = (next: string) => onChange(next);

          return (
            <div className="flex flex-col gap-2">
              <Label>{label}</Label>
              <div className="flex justify-center gap-2">
                {digits.map((digit: string, index: number) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                      if (index === 0 && ref) {
                        (ref as React.RefCallback<HTMLInputElement>)(el);
                      }
                    }}
                    value={digit}
                    aria-invalid={Boolean(fieldError)}
                    aria-label={`Digit ${index + 1} of ${length}`}
                    maxLength={1}
                    inputMode="numeric"
                    className="h-12 w-10 text-center text-xl"
                    onChange={(e) => handleChange(index, e.target.value, value, setValue)}
                    onKeyDown={(e) => handleKeyDown(e, index, value, setValue)}
                    onPaste={(e) => handlePaste(e, index, setValue)}
                    {...field}
                  />
                ))}
              </div>
              {fieldError?.message && (
                <p className="text-center text-sm text-destructive">{fieldError.message as ReactNode}</p>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
