import React, { useEffect, useState, useCallback } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Maximize,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ViewerImage {
  url: string;
  name?: string;
}

interface Props {
  images: ViewerImage[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

const ZOOM_STEP = 0.5;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 5;

export function ImageViewer({ images, initialIndex = 0, open, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setIndex(initialIndex);
    setZoom(1);
    setRotation(0);
  }, [initialIndex, open]);

  const resetTransform = () => {
    setZoom(1);
    setRotation(0);
  };

  const goTo = useCallback((i: number) => {
    setIndex(i);
    setZoom(1);
    setRotation(0);
  }, []);

  const prev = useCallback(
    () => goTo((index - 1 + images.length) % images.length),
    [index, images.length, goTo],
  );
  const next = useCallback(() => goTo((index + 1) % images.length), [index, images.length, goTo]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
      if (e.key === '-') setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, prev, next, onClose]);

  if (!images.length) return null;
  const current = images[index];

  const toolbarButton =
    'h-8 w-8 text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-40';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col bg-black/95 outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            {current.name ?? 'Image viewer'}
          </DialogPrimitive.Title>

          {/* Top bar */}
          <div className="flex shrink-0 items-center justify-between bg-black/60 px-4 py-2">
            <p className="max-w-[60%] truncate text-sm text-zinc-300">
              {current.name ?? ''}
              {images.length > 1 && (
                <span className="ml-2 text-zinc-500">
                  {index + 1} / {images.length}
                </span>
              )}
            </p>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={toolbarButton}
                title="Zoom out (-)"
                onClick={() => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN))}
                disabled={zoom <= ZOOM_MIN}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={toolbarButton}
                title="Reset zoom (100%)"
                onClick={resetTransform}
              >
                <Maximize className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={toolbarButton}
                title="Zoom in (+)"
                onClick={() => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX))}
                disabled={zoom >= ZOOM_MAX}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={toolbarButton}
                title="Rotate left"
                onClick={() => setRotation((r) => r - 90)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={toolbarButton}
                title="Rotate right"
                onClick={() => setRotation((r) => r + 90)}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(toolbarButton, 'ml-2')}
                title="Close (Esc)"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Image area */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            {images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={prev}
                className="absolute left-2 z-10 h-10 w-10 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            <img
              src={current.url}
              alt={current.name ?? ''}
              draggable={false}
              className={cn(
                'max-h-full max-w-full select-none object-contain transition-transform duration-200',
                zoom > 1 ? 'cursor-grab' : 'cursor-default',
              )}
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
            />

            {images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={next}
                className="absolute right-2 z-10 h-10 w-10 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>

          {/* Thumbnails strip */}
          {images.length > 1 && (
            <div className="flex shrink-0 justify-center gap-2 overflow-x-auto bg-black/60 px-4 py-2">
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img.url}
                  alt={img.name ?? ''}
                  onClick={() => goTo(i)}
                  className={cn(
                    'h-14 w-14 shrink-0 cursor-pointer rounded object-cover',
                    i === index
                      ? 'border-2 border-primary opacity-100'
                      : 'border-2 border-transparent opacity-60 hover:opacity-100',
                  )}
                />
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
