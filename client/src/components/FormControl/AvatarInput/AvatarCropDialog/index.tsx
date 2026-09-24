import { useCallback, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import EasyCropper, { type Area } from "react-easy-crop";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { getCroppedAvatarBlob } from "~/lib/cropImage";

const Cropper = EasyCropper as unknown as ComponentType<{
  image: string;
  crop: { x: number; y: number };
  zoom: number;
  aspect: number;
  cropShape?: "rect" | "round";
  showGrid?: boolean;
  onCropChange: (crop: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
}>;

interface Props {
  imageSrc: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (file: File) => void;
  onCancel: () => void;
  fileName: string;
}

export default function AvatarCropDialog({
  imageSrc,
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  fileName,
}: Props) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const blob = await getCroppedAvatarBlob(imageSrc, croppedAreaPixels);
      const baseName = fileName.replace(/\.[^.]+$/, "") || "avatar";
      const file = new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
      onConfirm(file);
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleCancel();
        }
      }}
    >
      <DialogContent className="max-w-md gap-4 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{t("avatar.crop.title")}</DialogTitle>
          <DialogDescription>{t("avatar.crop.description")}</DialogDescription>
        </DialogHeader>

        <div className="relative h-64 w-full overflow-hidden rounded-lg bg-muted sm:h-72">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="avatar-crop-zoom" className="text-sm text-muted-foreground">
            {t("avatar.crop.zoom")}
          </label>
          <input
            id="avatar-crop-zoom"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full accent-primary"
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={zoom}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isProcessing}>
            {t("avatar.crop.cancel")}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isProcessing || !croppedAreaPixels}>
            {t("avatar.crop.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
