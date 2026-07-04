import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Skeleton,
} from '@mui/material';
import { ArrowBack, OpenInNew, BrokenImage } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useGetUtilityByIdQuery, useMarkUtilityPaidMutation } from '../../entities/utilities/api/utilitiesApi';
import { useGetFilesByOwnerQuery, useLazyGetFileUrlQuery } from '../../entities/files/api/filesApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { ImageViewer, ViewerImage } from '../../shared/ui/ImageViewer';
import { formatMoney, formatMonthYear } from '../../shared/utils/formatMoney';

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
    <Box
      onClick={onOpen}
      sx={{
        width: 120,
        height: 120,
        borderRadius: 2,
        overflow: 'hidden',
        border: '2px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
        '&:hover': { borderColor: 'primary.main', '& .overlay': { opacity: 1 } },
      }}
    >
      {isLoading && <CircularProgress size={24} />}

      {!isLoading && url && !isPdf && (
        <>
          {!loaded && !errored && <Skeleton variant="rectangular" width={120} height={120} sx={{ position: 'absolute' }} />}
          {errored && <BrokenImage color="disabled" />}
          <Box
            component="img"
            src={url}
            alt={name}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: loaded ? 'block' : 'none',
            }}
          />
        </>
      )}

      {!isLoading && (isPdf || !url) && (
        <Box textAlign="center" p={1}>
          <OpenInNew color="action" />
          <Typography variant="caption" display="block" noWrap title={name} mt={0.5}>
            {name}
          </Typography>
        </Box>
      )}

      <Box
        className="overlay"
        sx={{
          position: 'absolute', inset: 0,
          bgcolor: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.15s',
        }}
      >
        <OpenInNew sx={{ color: 'white' }} />
      </Box>
    </Box>
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

  if (isLoading) {
    return (
      <Box>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !record) {
    return <Alert severity="error">{t('utilities.failedToLoad')}</Alert>;
  }

  const aptLabel = record.apartment
    ? `${record.apartment.address}${record.apartment.unitNumber ? ` · ${record.apartment.unitNumber}` : ''}`
    : record.apartmentId;

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Tooltip title={t('common.back')}>
          <IconButton onClick={() => navigate('/utilities')} size="small">
            <ArrowBack />
          </IconButton>
        </Tooltip>
        <Typography variant="h5">
          {t('utilities.detailTitle')}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('utilities.detailInfo')}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box display="flex" flexDirection="column" gap={1.5}>
              <InfoRow label={t('common.apartment')} value={aptLabel} />
              <InfoRow label={t('common.type')} value={record.type} />
              <InfoRow label={t('common.period')} value={formatMonthYear(record.periodYear, record.periodMonth)} />
              <InfoRow label={t('common.amount')} value={formatMoney(record.amount)} />
              {record.readingFrom != null && record.readingTo != null && (
                <InfoRow
                  label={t('utilities.readings')}
                  value={`${record.readingFrom} → ${record.readingTo}`}
                />
              )}
              {record.notes && <InfoRow label={t('common.notes')} value={record.notes} />}
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                  {t('common.status')}
                </Typography>
                <StatusBadge status={record.status} />
              </Box>
            </Box>

            {record.status === 'UNPAID' && (
              <Button
                variant="contained"
                color="success"
                sx={{ mt: 3 }}
                disabled={paying}
                onClick={() => void markPaid(record.id).then(() => navigate('/utilities'))}
              >
                {paying ? <CircularProgress size={20} /> : t('utilities.markPaid')}
              </Button>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, minHeight: 200 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('utilities.receiptsSection')}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {filesLoading && <CircularProgress size={24} />}

            {!filesLoading && files.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {t('utilities.noReceipts')}
              </Typography>
            )}

            <Box display="flex" flexWrap="wrap" gap={1.5}>
              {files.map((f) => {
                const isPdf = f.mimeType === 'application/pdf';
                const imgIdx = imageFiles.indexOf(f);
                return (
                  <ReceiptThumbnail
                    key={f.id}
                    fileId={f.id}
                    name={f.originalName}
                    mimeType={f.mimeType}
                    onOpen={() => isPdf ? void openPdf(f.id) : void openViewer(imgIdx)}
                  />
                );
              })}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <ImageViewer
        images={resolvedUrls}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </Box>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box display="flex" alignItems="flex-start" gap={1}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}
