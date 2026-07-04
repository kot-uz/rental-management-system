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
} from '@mui/material';
import { Add, FileDownload } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetRepairsQuery, useCreateRepairMutation, Repair } from '../../entities/repairs/api/repairsApi';
import { useGetApartmentsQuery } from '../../entities/apartments/api/apartmentsApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { TagFilter } from '../../widgets/EntityTags/TagFilter';
import { useAppSelector } from '../../shared/hooks/useAppSelector';
import { downloadFile } from '../../shared/utils/download';
import { formatDate } from '../../shared/utils/formatMoney';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  apartmentId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  location: z.string().optional(),
  costEstimate: z.coerce.number().optional(),
  contractorName: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function RepairsPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const navigate = useNavigate();
  const token = useAppSelector((s) => s.auth.accessToken);

  const { data, isLoading, error } = useGetRepairsQuery({ tagId: tagFilter || undefined });
  const { data: aptsData } = useGetApartmentsQuery({});
  const [create, { isLoading: creating }] = useCreateRepairMutation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { severity: 'LOW' },
  });

  const onSubmit = async (d: FormData) => {
    await create(d);
    reset();
    setOpen(false);
  };

  const repairs = (data?.data ?? []) as Repair[];
  const apartments = aptsData?.data ?? [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5">{t('repairs.title')}</Typography>
        <Box display="flex" gap={1}>
          <Can permission="repairs:export">
            <Button variant="outlined" startIcon={<FileDownload />} onClick={() => downloadFile('/reports/repairs.csv', token)}>
              {t('common.exportCsv')}
            </Button>
          </Can>
          <Can permission="repairs:create">
            <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>{t('repairs.reportIssue')}</Button>
          </Can>
        </Box>
      </Box>

      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TagFilter value={tagFilter} onChange={setTagFilter} />
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>}
      {error && <Alert severity="error">{t('repairs.failedToLoad')}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('common.name')}</TableCell>
              <TableCell>{t('common.apartment')}</TableCell>
              <TableCell>{t('repairs.severity')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell>{t('repairs.created')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {repairs.map((r) => (
              <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/repairs/${r.id}`)}>
                <TableCell>{r.title}</TableCell>
                <TableCell>{r.apartment ? `${r.apartment.address}${r.apartment.unitNumber ? ` · ${r.apartment.unitNumber}` : ''}` : '—'}</TableCell>
                <TableCell><StatusBadge status={r.severity} /></TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell>{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
            {!isLoading && repairs.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t('repairs.noRepairs')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('repairs.reportDialog')}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" error={!!errors.apartmentId}>
                  <InputLabel>{t('leases.apartmentLabel')}</InputLabel>
                  <Select {...register('apartmentId')} label={t('leases.apartmentLabel')} defaultValue="">
                    {apartments.map((a) => (
                      <MenuItem key={a.id} value={a.id}>{a.address}{a.unitNumber ? ` · ${a.unitNumber}` : ''}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField {...register('title')} label={t('repairs.titleField')} fullWidth error={!!errors.title} helperText={errors.title?.message} />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('repairs.severity')}</InputLabel>
                  <Select {...register('severity')} label={t('repairs.severity')} defaultValue="LOW">
                    <MenuItem value="LOW">{t('repairs.severityLow')}</MenuItem>
                    <MenuItem value="MEDIUM">{t('repairs.severityMedium')}</MenuItem>
                    <MenuItem value="HIGH">{t('repairs.severityHigh')}</MenuItem>
                    <MenuItem value="CRITICAL">{t('repairs.severityCritical')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('location')} label={t('repairs.location')} fullWidth placeholder={t('repairs.locationPlaceholder')} />
              </Grid>
              <Grid item xs={12}>
                <TextField {...register('description')} label={t('common.description')} fullWidth multiline rows={2} />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('costEstimate')} label={t('repairs.costEstimate')} type="number" fullWidth />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('contractorName')} label={t('repairs.contractorName')} fullWidth />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={creating}>
              {creating ? <CircularProgress size={20} /> : t('common.create')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
