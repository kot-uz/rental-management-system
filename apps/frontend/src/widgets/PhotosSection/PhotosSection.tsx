import React, { useRef, useState } from 'react';
import { Box, Button, CircularProgress, IconButton, Typography } from '@mui/material';
import { AddPhotoAlternate, Delete } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  useGetFilesByOwnerQuery,
  useUploadFileMutation,
  useDeleteFileMutation,
  useGetFileThumbQuery,
  useLazyGetFileUrlQuery,
  FileAsset,
} from '../../entities/files/api/filesApi';
import { Can } from '../../shared/ui/Can';
import { ImageViewer, ViewerImage } from '../../shared/ui/ImageViewer';

interface Props {
  ownerType: string;
  ownerId: string;
  /** Permission gating upload/delete actions. Default: repairs. */
  permission?: string;
  /** FileAsset purpose tag stored on upload. Default: 'repair-photo'. */
  purpose?: string;
  /** Translation keys for the section's labels. Default to the repairs copy. */
  titleKey?: string;
  addKey?: string;
  emptyKey?: string;
}

const IMAGE_RE = /^image\//;

/**
 * Photo gallery for a polymorphic owner (e.g. a repair or a tenant). Reuses the
 * generic FileAsset infrastructure (S3 + async image processing): uploads land
 * as PENDING and the worker generates web/thumb variants sub-second, so we
 * refetch shortly after upload to surface the processed image.
 */
export function PhotosSection({
  ownerType,
  ownerId,
  permission = 'repairs:update',
  purpose = 'repair-photo',
  titleKey = 'repairs.photos',
  addKey = 'repairs.addPhoto',
  emptyKey = 'repairs.noPhotos',
}: Props) {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useGetFilesByOwnerQuery({ ownerType, ownerId });
  const [upload, { isLoading: uploading }] = useUploadFileMutation();
  const [remove] = useDeleteFileMutation();
  const [fetchUrl] = useLazyGetFileUrlQuery();
  const inputRef = useRef<HTMLInputElement>(null);

  const [viewerImages, setViewerImages] = useState<ViewerImage[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const photos = (data?.data ?? []).filter((f) => IMAGE_RE.test(f.mimeType));

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('ownerType', ownerType);
      fd.append('ownerId', ownerId);
      fd.append('purpose', purpose);
      try {
        await upload(fd).unwrap();
      } catch {
        /* surfaced via the disabled state; keep going for the rest */
      }
    }
    e.target.value = '';
    // Image variants are produced asynchronously — refetch once they're likely LIVE.
    setTimeout(() => refetch(), 1200);
    setTimeout(() => refetch(), 3000);
  };

  const openViewer = async (index: number) => {
    const images = await Promise.all(
      photos.map(async (p) => {
        const res = await fetchUrl(p.id).unwrap();
        return { url: res.data.url, name: p.originalName } as ViewerImage;
      }),
    );
    setViewerImages(images);
    setViewerIndex(index);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1">{t(titleKey)}</Typography>
        <Can permission={permission}>
          <Button
            variant="outlined"
            startIcon={<AddPhotoAlternate />}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <CircularProgress size={20} /> : t(addKey)}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={onFiles}
          />
        </Can>
      </Box>

      {isLoading && (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && photos.length === 0 && (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          {t(emptyKey)}
        </Typography>
      )}

      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fill, minmax(140px, 1fr))"
        gap={2}
      >
        {photos.map((p, i) => (
          <PhotoThumb
            key={p.id}
            file={p}
            permission={permission}
            onOpen={() => openViewer(i)}
            onDelete={() => remove(p.id)}
          />
        ))}
      </Box>

      <ImageViewer
        images={viewerImages}
        initialIndex={viewerIndex ?? 0}
        open={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
      />
    </Box>
  );
}

function PhotoThumb({
  file,
  permission,
  onOpen,
  onDelete,
}: {
  file: FileAsset;
  permission: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { data } = useGetFileThumbQuery(file.id);
  const thumbUrl = data?.data?.url ?? null;

  return (
    <Box
      sx={{
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: 'grey.100',
      }}
    >
      {thumbUrl ? (
        <Box
          component="img"
          src={thumbUrl}
          alt={file.originalName}
          onClick={onOpen}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
        />
      ) : (
        <Box display="flex" alignItems="center" justifyContent="center" height="100%">
          <CircularProgress size={22} />
        </Box>
      )}
      <Can permission={permission}>
        <IconButton
          size="small"
          onClick={onDelete}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: '#fff',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
          }}
        >
          <Delete fontSize="small" />
        </IconButton>
      </Can>
    </Box>
  );
}
