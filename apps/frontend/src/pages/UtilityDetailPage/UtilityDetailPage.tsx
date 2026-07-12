import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink, ImageOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGetUtilityByIdQuery, useMarkUtilityPaidMutation } from '../../entities/utilities/api/utilitiesApi';
import { useGetFilesByOwnerQuery, useLazyGetFileUrlQuery } from '../../entities/files/api/filesApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { ImageViewer, ViewerImage } from '../../shared/ui/ImageViewer';
import { PageSpinner } from '../../shared/ui/Spinner';
import { BackButton } from '../../shared/ui/DetailBits';
import { formatMoney, formatMonthYear } from '../../shared/utils/formatMoney';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

function ReceiptThumbnail({
  fileId,
  name,
  mimeType,
  onOpen,
}: {
  fileId: string;
  name: string;
  mimeType: string;
  onOpen: () => void;
}) {
  const [getUrl, { data: urlResponse, isLoading }] = useLazyGetFileUrlQuery();
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  React.useEffect(() => {
    void getUrl(fileId);
  }, [fileId, getUrl]);

  const url = urlResponse?.data?.url;
  const isPdf = mimeType === 'application/pdf';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 bg-muted transition-colors hover:border-primary"
    >
      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}

      {!isLoading && url && !isPdf && (
        <>
          {!loaded && !errored && <Skeleton className="absolute inset-0" />}
          {errored && <ImageOff className="h-5 w-5 text-muted-foreground" />}
          <img
            src={url}
            alt={name}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={loaded ? 'block h-full w-full object-cover' : 'hidden'}
          />
        </>
      )}

      {!isLoading && (isPdf || !url) && (
        <span className="p-2 text-center">
          <ExternalLink className="mx-auto h-4 w-4 text-muted-foreground" />
          <span className="mt-1 block max-w-24 truncate text-xs" title={name}>
            {name}
          </span>
        </span>
      )}

      <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
        <ExternalLink className="h-5 w-5 text-white" />
      </span>
    </button>
  );
}

export function UtilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: utilityResponse, isLoading, error } = useGetUtilityByIdQuery(id!);
  const { data: filesResponse, isLoading: filesLoading } = useGetFilesByOwnerQuery(
    { ownerType: 'utility', ownerId: id! },
    { skip: !id },
  );
  const [markPaid, { isLoading: paying }] = useMarkUtilityPaidMutation();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [resolvedUrls, setResolvedUrls] = useState<ViewerImage[]>([]);
  const [getUrl] = useLazyGetFileUrlQuery();

  const record = utilityResponse?.data;
  const files = filesResponse?.data ?? [];
  const imageFiles = files.filter((f) => f.mimeType?.startsWith('image/'));

  const openViewer = async (startIndex: number) => {
    const urls = await Promise.all(
      imageFiles.map(async (f) => {
        const res = await getUrl(f.id);
        const url = res.data?.data?.url ?? '';
        return { url, name: f.originalName };
      }),
    );
    setResolvedUrls(urls.filter((u) => u.url));
    setViewerIndex(startIndex);
    setViewerOpen(true);
  };

  const openPdf = async (fileId: string) => {
    const res = await getUrl(fileId);
    const url = res.data?.data?.url;
    if (url) window.open(url, '_blank');
  };

  if (isLoading) return <PageSpinner />;

  if (error || !record) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t('utilities.failedToLoad')}</AlertDescription>
      </Alert>
    );
  }

  const aptLabel = record.apartment
    ? `${record.apartment.address}${record.apartment.unitNumber ? ` · ${record.apartment.unitNumber}` : ''}`
    : record.apartmentId;

  return (
    <div>
      <BackButton onClick={() => navigate('/app/utilities')} />
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{t('utilities.detailTitle')}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">{t('utilities.detailInfo')}</p>
            <Separator className="my-3" />

            <div className="flex flex-col gap-3">
              <InfoRow label={t('common.apartment')} value={aptLabel} />
              <InfoRow label={t('common.type')} value={record.type} />
              <InfoRow
                label={t('common.period')}
                value={formatMonthYear(record.periodYear, record.periodMonth)}
              />
              <InfoRow label={t('common.amount')} value={formatMoney(record.amount)} />
              {record.readingFrom != null && record.readingTo != null && (
                <InfoRow
                  label={t('utilities.readings')}
                  value={`${record.readingFrom} → ${record.readingTo}`}
                />
              )}
              {record.notes && <InfoRow label={t('common.notes')} value={record.notes} />}
              <div className="flex items-center gap-2">
                <span className="min-w-32 shrink-0 text-sm text-muted-foreground">
                  {t('common.status')}
                </span>
                <StatusBadge status={record.status} />
              </div>
            </div>

            {record.status === 'UNPAID' && (
              <Button
                className="mt-6 bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={paying}
                onClick={() => void markPaid(record.id).then(() => navigate('/app/utilities'))}
              >
                {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('utilities.markPaid')}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="min-h-52 p-6">
            <p className="text-sm font-medium text-muted-foreground">
              {t('utilities.receiptsSection')}
            </p>
            <Separator className="my-3" />

            {filesLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}

            {!filesLoading && files.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('utilities.noReceipts')}</p>
            )}

            <div className="flex flex-wrap gap-3">
              {files.map((f) => {
                const isPdf = f.mimeType === 'application/pdf';
                const imgIdx = imageFiles.indexOf(f);
                return (
                  <ReceiptThumbnail
                    key={f.id}
                    fileId={f.id}
                    name={f.originalName}
                    mimeType={f.mimeType}
                    onOpen={() => (isPdf ? void openPdf(f.id) : void openViewer(imgIdx))}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <ImageViewer
        images={resolvedUrls}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="min-w-32 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
