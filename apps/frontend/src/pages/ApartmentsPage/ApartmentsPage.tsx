import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Add, Search, FileDownload } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetApartmentsQuery, useCreateApartmentMutation, Apartment } from '../../entities/apartments/api/apartmentsApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { TagFilter } from '../../widgets/EntityTags/TagFilter';
import { useAppSelector } from '../../shared/hooks/useAppSelector';
import { downloadFile } from '../../shared/utils/download';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const makeSchema = (t: (k: string) => string) =>
  z.object({
    address: z.string().min(1, t('validation.addressRequired')),
    unitNumber: z.string().optional(),
    floor: z.coerce.number().optional(),
    rooms: z.coerce.number().int().min(1).optional(),
    areaSqm: z.coerce.number().positive().optional(),
    notes: z.string().optional(),
  });

type FormData = z.infer<ReturnType<typeof makeSchema>>;

export function ApartmentsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const token = useAppSelector((s) => s.auth.accessToken);

  const { data, isLoading, error } = useGetApartmentsQuery({ search: search || undefined, status: statusFilter || undefined, tagId: tagFilter || undefined });
  const [createApartment, { isLoading: creating }] = useCreateApartmentMutation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(makeSchema(t)),
  });

  const onSubmit = async (formData: FormData) => {
    await createApartment(formData);
    reset();
    setOpen(false);
  };

  const apartments = (data?.data ?? []) as Apartment[];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5">{t('apartments.title')}</Typography>
        <Box display="flex" gap={1}>
          <Can permission="apartments:export">
            <Button variant="outlined" startIcon={<FileDownload />} onClick={() => downloadFile('/reports/apartments.csv', token)}>
              {t('common.exportCsv')}
            </Button>
          </Can>
          <Can permission="apartments:create">
            <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
              {t('apartments.addApartment')}
            </Button>
          </Can>
        </Box>
      </Box>

      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          placeholder={t('apartments.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
          sx={{ minWidth: 250 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t('common.status')}</InputLabel>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label={t('common.status')}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            <MenuItem value="VACANT">{t('apartments.statusVacant')}</MenuItem>
            <MenuItem value="OCCUPIED">{t('apartments.statusOccupied')}</MenuItem>
            <MenuItem value="ARCHIVED">{t('apartments.statusArchived')}</MenuItem>
          </Select>
        </FormControl>
        <TagFilter value={tagFilter} onChange={setTagFilter} />
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>}
      {error && <Alert severity="error">{t('apartments.failedToLoad')}</Alert>}

      <Grid container spacing={2}>
        {apartments.map((apt) => (
          <Grid item xs={12} sm={6} lg={4} key={apt.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
              onClick={() => navigate(`/apartments/${apt.id}`)}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Typography variant="h6" fontSize={15} fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                    {apt.address}
                    {apt.unitNumber && ` · ${apt.unitNumber}`}
                  </Typography>
                  <StatusBadge status={apt.status} />
                </Box>
                <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                  {apt.rooms && <Chip label={t('apartments.roomsChip', { count: apt.rooms })} size="small" />}
                  {apt.areaSqm && <Chip label={`${apt.areaSqm} m²`} size="small" />}
                  {apt.floor && <Chip label={t('apartments.floorChip', { floor: apt.floor })} size="small" />}
                </Box>
                {apt.leases?.[0] && (
                  <Box mt={2}>
                    <Typography variant="body2" color="text.secondary">
                      {t('apartments.tenantLabel')} {apt.leases[0].parties?.[0]?.tenant?.firstName ?? '—'} {apt.leases[0].parties?.[0]?.tenant?.lastName ?? ''}
                    </Typography>
                    <Typography variant="body2" color="primary" fontWeight={500}>
                      ${Number(apt.leases[0].monthlyRent).toLocaleString()}/mo
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
        {!isLoading && apartments.length === 0 && (
          <Grid item xs={12}>
            <Box textAlign="center" py={6} color="text.secondary">
              <Typography>{t('apartments.noApartments')}</Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('apartments.addDialog')}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField {...register('address')} label={t('common.address')} fullWidth error={!!errors.address} helperText={errors.address?.message} />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('unitNumber')} label={t('apartments.unitNumber')} fullWidth />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('floor')} label={t('apartments.floor')} type="number" fullWidth />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('rooms')} label={t('apartments.rooms')} type="number" fullWidth />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('areaSqm')} label={t('apartments.areaSqm')} type="number" fullWidth />
              </Grid>
              <Grid item xs={12}>
                <TextField {...register('notes')} label={t('common.notes')} fullWidth multiline rows={2} />
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
