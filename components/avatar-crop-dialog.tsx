"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getCroppedImageBlob } from "@/lib/crop-image";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type AvatarCropDialogProps = {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (file: File) => void | Promise<void>;
  isSaving?: boolean;
};

export function AvatarCropDialog({
  open,
  imageSrc,
  onOpenChange,
  onConfirm,
  isSaving = false,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, {
        mimeType: "image/jpeg",
        quality: 0.92,
        outputSize: 512,
      });
      const file = new File([blob], `avatar-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      await onConfirm(file);
    } catch (error) {
      console.error("Avatar crop failed:", error);
      toast.error("Nepodařilo se připravit ořez fotky.");
    } finally {
      setIsProcessing(false);
    }
  };

  const busy = isSaving || isProcessing;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md sm:rounded-2xl">
        <DialogHeader className="space-y-1 px-5 pb-3 pt-5 text-left sm:px-6 sm:pt-6">
          <DialogTitle>Upravit fotku</DialogTitle>
          <DialogDescription>
            Posuňte a přibližte fotku tak, jak ji chcete mít v profilu.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-5 h-72 overflow-hidden rounded-2xl bg-zinc-950 sm:mx-6">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              classes={{
                cropAreaClassName: "!rounded-2xl border-2 border-white/90",
              }}
            />
          ) : null}
        </div>

        <div className="space-y-2 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor="avatar-zoom"
              className="text-xs text-muted-foreground"
            >
              Přiblížení
            </Label>
            <span className="tabular-nums text-[11px] text-muted-foreground">
              {zoom.toFixed(1)}×
            </span>
          </div>
          <input
            id="avatar-zoom"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            disabled={busy || !imageSrc}
            onChange={(e) => setZoom(Number(e.target.value))}
            className={cn(
              "h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-blue-600",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
        </div>

        <DialogFooter className="flex-row justify-end gap-2 border-t border-border/60 px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Zrušit
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
            disabled={busy || !imageSrc || !croppedAreaPixels}
            onClick={() => void handleConfirm()}
          >
            {busy ? "Ukládám…" : "Použít fotku"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
