import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';

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
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">{t(titleKey)}</h3>
        <Can permission={permission}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 h-4 w-4" />
            )}
            {t(addKey)}
          </Button>
          <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
        </Can>
      </div>

      {isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && photos.length === 0 && (
        <p className="py-3 text-sm text-muted-foreground">{t(emptyKey)}</p>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
        {photos.map((p, i) => (
          <PhotoThumb
            key={p.id}
            file={p}
            permission={permission}
            onOpen={() => openViewer(i)}
            onDelete={() => remove(p.id)}
          />
        ))}
      </div>

      <ImageViewer
        images={viewerImages}
        initialIndex={viewerIndex ?? 0}
        open={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
      />
    </div>
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
    <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={file.originalName}
          onClick={onOpen}
          className="block h-full w-full cursor-pointer object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <Can permission={permission}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="absolute right-1 top-1 h-7 w-7 bg-black/50 text-white hover:bg-black/70 hover:text-white"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </Can>
    </div>
  );
}
