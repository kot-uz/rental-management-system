import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  IconButton,
  Dialog,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  Close,
  ZoomIn,
  ZoomOut,
  RotateLeft,
  RotateRight,
  NavigateBefore,
  NavigateNext,
  ZoomOutMap,
} from '@mui/icons-material';

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

  const prev = useCallback(() => goTo((index - 1 + images.length) % images.length), [index, images.length, goTo]);
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column' } }}
    >
      {/* Top bar */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={2}
        py={1}
        sx={{ bgcolor: 'rgba(0,0,0,0.6)', flexShrink: 0 }}
      >
        <Typography variant="body2" color="grey.300" noWrap sx={{ maxWidth: '60%' }}>
          {current.name ?? ''}
          {images.length > 1 && (
            <Typography component="span" variant="body2" color="grey.500" ml={1}>
              {index + 1} / {images.length}
            </Typography>
          )}
        </Typography>

        <Box display="flex" gap={0.5}>
          <Tooltip title="Zoom out (-)">
            <span>
              <IconButton size="small" onClick={() => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN))} disabled={zoom <= ZOOM_MIN} sx={{ color: 'grey.300' }}>
                <ZoomOut />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Reset zoom (100%)">
            <IconButton size="small" onClick={resetTransform} sx={{ color: 'grey.300' }}>
              <ZoomOutMap />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom in (+)">
            <span>
              <IconButton size="small" onClick={() => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX))} disabled={zoom >= ZOOM_MAX} sx={{ color: 'grey.300' }}>
                <ZoomIn />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Rotate left">
            <IconButton size="small" onClick={() => setRotation((r) => r - 90)} sx={{ color: 'grey.300' }}>
              <RotateLeft />
            </IconButton>
          </Tooltip>
          <Tooltip title="Rotate right">
            <IconButton size="small" onClick={() => setRotation((r) => r + 90)} sx={{ color: 'grey.300' }}>
              <RotateRight />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close (Esc)">
            <IconButton size="small" onClick={onClose} sx={{ color: 'grey.300', ml: 1 }}>
              <Close />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Image area */}
      <Box
        flex={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
        position="relative"
      >
        {images.length > 1 && (
          <IconButton
            onClick={prev}
            sx={{
              position: 'absolute', left: 8, zIndex: 10,
              color: 'white', bgcolor: 'rgba(0,0,0,0.4)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
          >
            <NavigateBefore fontSize="large" />
          </IconButton>
        )}

        <Box
          component="img"
          src={current.url}
          alt={current.name ?? ''}
          sx={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease',
            userSelect: 'none',
            cursor: zoom > 1 ? 'grab' : 'default',
          }}
          draggable={false}
        />

        {images.length > 1 && (
          <IconButton
            onClick={next}
            sx={{
              position: 'absolute', right: 8, zIndex: 10,
              color: 'white', bgcolor: 'rgba(0,0,0,0.4)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
          >
            <NavigateNext fontSize="large" />
          </IconButton>
        )}
      </Box>

      {/* Thumbnails strip */}
      {images.length > 1 && (
        <Box
          display="flex"
          gap={1}
          px={2}
          py={1}
          sx={{ bgcolor: 'rgba(0,0,0,0.6)', flexShrink: 0, overflowX: 'auto' }}
          justifyContent="center"
        >
          {images.map((img, i) => (
            <Box
              key={i}
              component="img"
              src={img.url}
              alt={img.name ?? ''}
              onClick={() => goTo(i)}
              sx={{
                width: 56,
                height: 56,
                objectFit: 'cover',
                borderRadius: 1,
                cursor: 'pointer',
                border: i === index ? '2px solid' : '2px solid transparent',
                borderColor: i === index ? 'primary.main' : 'transparent',
                opacity: i === index ? 1 : 0.6,
                flexShrink: 0,
                '&:hover': { opacity: 1 },
              }}
            />
          ))}
        </Box>
      )}
    </Dialog>
  );
}
