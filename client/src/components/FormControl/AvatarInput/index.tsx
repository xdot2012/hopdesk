import { AxiosError } from "axios";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Loader2, X } from "lucide-react";
import { Control, Controller, FieldError, FieldErrorsImpl, Merge } from "react-hook-form";
import uploadAvatar from "~/api/user/uploadAvatar";
import { getFieldValidationMessage } from "~/util/functions";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import AuthenticatedAvatarImage from "~/components/AuthenticatedAvatarImage";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import AvatarCropDialog from "./AvatarCropDialog";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface CropState {
  src: string;
  fileName: string;
}

interface Props {
  control: Control<any>;
  fieldError: FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined;
  name: string;
  defaultValue?: string;
  label?: string;
  fallbackText?: string;
  previewUrl?: string;
  showLabel?: boolean;
  centered?: boolean;
  className?: string;
}

export default function AvatarInput({
  name,
  defaultValue,
  label,
  control,
  fieldError,
  fallbackText = "?",
  previewUrl = "",
  showLabel = true,
  centered = true,
  className,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);
  const [cropState, setCropState] = useState<CropState | null>(null);

  useEffect(() => {
    if (uploadedPreviewUrl && previewUrl && uploadedPreviewUrl === previewUrl) {
      setUploadedPreviewUrl(null);
    }
  }, [previewUrl, uploadedPreviewUrl]);

  useEffect(() => {
    return () => {
      if (cropState?.src) {
        URL.revokeObjectURL(cropState.src);
      }
    };
  }, [cropState?.src]);

  const clearInteractionState = () => {
    setIsHovered(false);
    setTouchOpen(false);
  };

  const openFilePicker = () => {
    if (!isUploading) inputRef.current?.click();
  };

  const clearCropState = () => {
    if (cropState?.src) {
      URL.revokeObjectURL(cropState.src);
    }
    setCropState(null);
  };

  const uploadFile = async (file: File, onChange: (value: string) => void) => {
    setLocalError(null);
    setIsUploading(true);

    try {
      const uploaded = await uploadAvatar(file);
      onChange(uploaded.key);
      setUploadedPreviewUrl(uploaded.url);
      clearInteractionState();
    } catch (error) {
      const message = getFieldValidationMessage(error as AxiosError, "file");
      setLocalError(message ?? t("avatar.uploadError"));
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setIsUploading(false);
    }
  };

  const validateAndOpenCrop = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError(t("avatar.invalidType"));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setLocalError(t("avatar.maxSize"));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setLocalError(null);
    clearCropState();
    setCropState({
      src: URL.createObjectURL(file),
      fileName: file.name,
    });
  };

  return (
    <div className={cn("flex-1 pt-4", centered && "flex flex-col items-center", className)}>
      <Controller
        name={name}
        control={control}
        {...(defaultValue !== undefined ? { defaultValue } : {})}
        render={({ field: { value, onChange } }) => {
          const hasAvatar = Boolean(value);
          const displayUrl = uploadedPreviewUrl ?? (hasAvatar && previewUrl ? previewUrl : undefined);
          const showLoadingOverlay = isUploading;
          const showRemoveOverlay = hasAvatar && !isUploading && (isHovered || touchOpen);
          const showAddOverlay = !hasAvatar && !isUploading && (isHovered || touchOpen);

          const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;
            validateAndOpenCrop(file);
          };

          const handleCropCancel = () => {
            clearCropState();
            if (inputRef.current) inputRef.current.value = "";
          };

          const handleCropConfirm = async (file: File) => {
            clearCropState();
            if (inputRef.current) inputRef.current.value = "";
            await uploadFile(file, onChange);
          };

          const handleRemove = () => {
            onChange("");
            setUploadedPreviewUrl(null);
            clearInteractionState();
            if (inputRef.current) inputRef.current.value = "";
          };

          const handleAvatarClick = () => {
            if (isUploading) return;

            if (!hasAvatar) {
              openFilePicker();
              return;
            }

            setTouchOpen((open) => !open);
          };

          return (
            <div className={cn("space-y-2", centered && "flex flex-col items-center")}>
              {showLabel && label ? <Label>{label}</Label> : null}

              <div
                className={cn(
                  "group relative inline-flex",
                  !hasAvatar && "cursor-pointer",
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                  clearInteractionState();
                }}
                onClick={handleAvatarClick}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleAvatarClick();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={hasAvatar ? t("avatar.removePhoto") : t("avatar.addPhoto")}
              >
                <Avatar className="h-20 w-20">
                  {displayUrl ? (
                    <AuthenticatedAvatarImage
                      key={displayUrl}
                      src={displayUrl}
                      alt={t("avatar.profilePhoto")}
                    />
                  ) : null}
                  <AvatarFallback className="text-xl">{fallbackText}</AvatarFallback>
                </Avatar>

                {showLoadingOverlay && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}

                {showRemoveOverlay && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-full bg-black/60">
                    <button
                      type="button"
                      className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
                      aria-label={t("avatar.changePhoto")}
                      onClick={(event) => {
                        event.stopPropagation();
                        openFilePicker();
                      }}
                    >
                      <Camera className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
                      aria-label={t("avatar.remove")}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemove();
                      }}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {showAddOverlay && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-100">
                    <div className="flex flex-col items-center gap-1 px-3 py-2 text-white">
                      <Camera className="h-5 w-5" />
                      <span className="text-xs font-medium">{t("avatar.add")}</span>
                    </div>
                  </div>
                )}

                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  className="sr-only"
                  disabled={isUploading}
                  onChange={handleFileChange}
                />
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {hasAvatar ? t("avatar.hintWithPhoto") : t("avatar.hintWithoutPhoto")}
              </p>

              {localError && (
                <p className="text-sm text-destructive text-center">{localError}</p>
              )}
              {fieldError?.message && (
                <p className="text-sm text-destructive text-center">{fieldError.message as string}</p>
              )}

              {cropState ? (
                <AvatarCropDialog
                  imageSrc={cropState.src}
                  fileName={cropState.fileName}
                  open={Boolean(cropState)}
                  onOpenChange={(open) => {
                    if (!open) handleCropCancel();
                  }}
                  onConfirm={handleCropConfirm}
                  onCancel={handleCropCancel}
                />
              ) : null}
            </div>
          );
        }}
      />
    </div>
  );
}
