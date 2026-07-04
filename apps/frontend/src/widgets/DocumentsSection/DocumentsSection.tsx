import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import { UploadFile, Delete, Visibility, Warning } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
  useLazyGetDocumentUrlQuery,
  DOCUMENT_TYPES,
} from '../../entities/documents/api/documentsApi';
import { Can } from '../../shared/ui/Can';
import { formatDate } from '../../shared/utils/formatMoney';

interface Props {
  ownerType: string;
  ownerId: string;
}

const EXPIRY_WARN_DAYS = 30;

export function DocumentsSection({ ownerType, ownerId }: Props) {
  const { t } = useTranslation();
  const { data, isLoading } = useGetDocumentsQuery({ ownerType, ownerId });
  const [upload, { isLoading: uploading }] = useUploadDocumentMutation();
  const [remove] = useDeleteDocumentMutation();
  const [fetchUrl] = useLazyGetDocumentUrlQuery();

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('OTHER');
  const [expiresAt, setExpiresAt] = useState('');

  const documents = data?.data ?? [];

  const onUpload = async () => {
    if (!file || !title) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('ownerType', ownerType);
    fd.append('ownerId', ownerId);
    fd.append('title', title);
    fd.append('documentType', documentType);
    if (expiresAt) fd.append('expiresAt', expiresAt);
    await upload(fd).unwrap();
    setOpen(false);
    setFile(null);
    setTitle('');
    setDocumentType('OTHER');
    setExpiresAt('');
  };

  const onView = async (id: string) => {
    const res = await fetchUrl(id).unwrap();
    window.open(res.data.url, '_blank', 'noopener');
  };

  const onDelete = async (id: string) => {
    if (window.confirm(t('common.deleteConfirm'))) await remove(id);
  };

  const isExpiringSoon = (iso?: string | null) => {
    if (!iso) return false;
    const days = (new Date(iso).getTime() - Date.now()) / 86_400_000;
    return days <= EXPIRY_WARN_DAYS;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={1}>
        <Can permission="documents:create">
          <Button variant="outlined" startIcon={<UploadFile />} onClick={() => setOpen(true)}>
            {t('documents.upload')}
          </Button>
        </Can>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('documents.titleField')}</TableCell>
              <TableCell>{t('documents.type')}</TableCell>
              <TableCell>{t('documents.expiresAt')}</TableCell>
              <TableCell>{t('documents.file')}</TableCell>
              <TableCell align="right">{t('common.action')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((d) => (
              <TableRow key={d.id} hover>
                <TableCell>{d.title}</TableCell>
                <TableCell><Chip label={d.documentType} size="small" variant="outlined" /></TableCell>
                <TableCell>
                  {d.expiresAt ? (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {isExpiringSoon(d.expiresAt) && (
                        <Tooltip title={t('documents.expiringSoon')}>
                          <Warning color="warning" fontSize="small" />
                        </Tooltip>
                      )}
                      {formatDate(d.expiresAt)}
                    </Box>
                  ) : '—'}
                </TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{d.file.originalName}</TableCell>
                <TableCell align="right">
                  <Tooltip title={t('documents.view')}>
                    <IconButton size="small" onClick={() => onView(d.id)}><Visibility fontSize="small" /></IconButton>
                  </Tooltip>
                  <Can permission="documents:delete">
                    <Tooltip title={t('common.delete')}>
                      <IconButton size="small" color="error" onClick={() => onDelete(d.id)}><Delete fontSize="small" /></IconButton>
                    </Tooltip>
                  </Can>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {t('documents.none')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('documents.upload')}</DialogTitle>
        <DialogContent>
          <Box mt={1} mb={2}>
            <Button component="label" variant="outlined" startIcon={<UploadFile />}>
              {file ? file.name : t('documents.chooseFile')}
              <input
                type="file"
                hidden
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Button>
          </Box>
          <TextField
            label={t('documents.titleField')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{t('documents.type')}</InputLabel>
            <Select value={documentType} label={t('documents.type')} onChange={(e) => setDocumentType(e.target.value)}>
              {DOCUMENT_TYPES.map((dt) => (
                <MenuItem key={dt} value={dt}>{dt}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t('documents.expiresAt')}
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={onUpload} disabled={uploading || !file || !title}>
            {uploading ? <CircularProgress size={20} /> : t('documents.upload')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
