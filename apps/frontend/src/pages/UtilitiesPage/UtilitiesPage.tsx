import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TableContainer,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import { Add, AttachFile, Close, Upload } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  useGetUtilitiesQuery,
  useCreateUtilityMutation,
  useMarkUtilityPaidMutation,
  useUpdateUtilityMutation,
  UtilityRecord,
} from '../../entities/utilities/api/utilitiesApi';
import { useGetApartmentsQuery } from '../../entities/apartments/api/apartmentsApi';
import { useUploadFileMutation } from '../../entities/files/api/filesApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { formatMoney, formatMonthYear } from '../../shared/utils/formatMoney';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  apartmentId: z.string().min(1),
  type: z.string().min(1),
  periodYear: z.coerce.number(),
  periodMonth: z.coerce.number().min(1).max(12),
  amount: z.coerce.number().positive(),
  readingFrom: z.coerce.number().optional(),
  readingTo: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const UTILITY_TYPES = ['ELECTRICITY', 'GAS', 'WATER', 'INTERNET', 'GARBAGE', 'HEATING', 'CUSTOM'];
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

export function UtilitiesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState('');
  const now = new Date();

  const { data, isLoading, error } = useGetUtilitiesQuery({});
  const { data: aptsData } = useGetApartmentsQuery({});
  const [create, { isLoading: creating }] = useCreateUtilityMutation();
  const [updateUtility] = useUpdateUtilityMutation();
  const [markPaid] = useMarkUtilityPaidMutation();
  const [uploadFile, { isLoading: uploading }] = useUploadFileMutation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'ELECTRICITY', periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1 },
  });

  const handleClose = () => {
    setOpen(false);
    setReceiptFiles([]);
    setUploadError('');
    reset();
  };

  const removeFile = (i: number) => {
    setReceiptFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const onSubmit = async (d: FormData) => {
    setUploadError('');
    const createResult = await create(d);
    if (!('data' in createResult) || !createResult.data) return;

    const utilityId = createResult.data.data.id;

    for (let i = 0; i < receiptFiles.length; i++) {
      const fd = new FormData();
      fd.append('file', receiptFiles[i]);
      fd.append('ownerId', utilityId);
      fd.append('ownerType', 'utility');
      fd.append('purpose', 'receipt');

      const uploadResult = await uploadFile(fd);
      if (!('data' in uploadResult) || !uploadResult.data) {
        setUploadError(t('utilities.uploadError'));
      } else if (i === 0) {
        await updateUtility({ id: utilityId, data: { receiptFileId: uploadResult.data.data.id } });
      }
    }

    handleClose();
  };

  const records = (data?.data ?? []) as UtilityRecord[];
  const apartments = aptsData?.data ?? [];
  const isBusy = creating || uploading;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5">{t('utilities.title')}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>{t('utilities.addRecord')}</Button>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>}
      {error && <Alert severity="error">{t('utilities.failedToLoad')}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('common.apartment')}</TableCell>
              <TableCell>{t('common.type')}</TableCell>
              <TableCell>{t('common.period')}</TableCell>
              <TableCell align="right">{t('common.amount')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell>{t('common.action')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((r) => (
              <TableRow
                key={r.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/utilities/${r.id}`)}
              >
                <TableCell>{r.apartment?.address ?? '—'}</TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell>{formatMonthYear(r.periodYear, r.periodMonth)}</TableCell>
                <TableCell align="right">{formatMoney(r.amount)}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell>
                  {r.status === 'UNPAID' && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      onClick={(e) => { e.stopPropagation(); void markPaid(r.id); }}
                    >
                      {t('utilities.markPaid')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && records.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t('utilities.noRecords')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t('utilities.addDialog')}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" error={!!errors.apartmentId}>
                  <InputLabel>{t('utilities.apartmentLabel')}</InputLabel>
                  <Select {...register('apartmentId')} label={t('utilities.apartmentLabel')} defaultValue="">
                    {apartments.map((a) => (
                      <MenuItem key={a.id} value={a.id}>{a.address}{a.unitNumber ? ` · ${a.unitNumber}` : ''}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('utilities.typeLabel')}</InputLabel>
                  <Select {...register('type')} label={t('utilities.typeLabel')} defaultValue="ELECTRICITY">
                    {UTILITY_TYPES.map((ut) => <MenuItem key={ut} value={ut}>{ut}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={3}>
                <TextField {...register('periodYear')} label={t('common.year')} type="number" fullWidth size="small" />
              </Grid>
              <Grid item xs={3}>
                <TextField {...register('periodMonth')} label={t('common.month')} type="number" fullWidth size="small" inputProps={{ min: 1, max: 12 }} />
              </Grid>
              <Grid item xs={12}>
                <TextField {...register('amount')} label={t('utilities.amountLabel')} type="number" fullWidth size="small" error={!!errors.amount} />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('readingFrom')} label={t('utilities.readingFrom')} type="number" fullWidth size="small" />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('readingTo')} label={t('utilities.readingTo')} type="number" fullWidth size="small" />
              </Grid>
              <Grid item xs={12}>
                <TextField {...register('notes')} label={t('common.notes')} fullWidth size="small" />
              </Grid>

              {/* Multi-file upload */}
              <Grid item xs={12}>
                <input
                  id="receipt-file-input"
                  type="file"
                  accept={ACCEPTED_TYPES}
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const added = Array.from(e.target.files ?? []);
                    setReceiptFiles((prev) => [...prev, ...added]);
                    setUploadError('');
                    e.target.value = '';
                  }}
                />
                <label htmlFor="receipt-file-input">
                  <Button component="span" variant="outlined" startIcon={<Upload />} fullWidth size="small">
                    {t('utilities.attachReceipts')}
                  </Button>
                </label>

                {receiptFiles.length > 0 && (
                  <List dense sx={{ mt: 1 }}>
                    {receiptFiles.map((f, i) => (
                      <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                        <AttachFile fontSize="small" color="primary" sx={{ mr: 1, flexShrink: 0 }} />
                        <ListItemText
                          primary={f.name}
                          primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                          sx={{ overflow: 'hidden' }}
                        />
                        <ListItemSecondaryAction>
                          <IconButton size="small" edge="end" onClick={() => removeFile(i)}>
                            <Close fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
                {uploadError && <Typography variant="caption" color="error" mt={0.5} display="block">{uploadError}</Typography>}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleClose}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={isBusy}>
              {isBusy ? <CircularProgress size={20} /> : t('common.create')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
