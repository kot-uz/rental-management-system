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
import { Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetLeasesQuery, useCreateLeaseMutation, Lease } from '../../entities/leases/api/leasesApi';
import { useGetApartmentsQuery } from '../../entities/apartments/api/apartmentsApi';
import { useGetTenantsQuery } from '../../entities/tenants/api/tenantsApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { formatMoney, formatDate } from '../../shared/utils/formatMoney';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  apartmentId: z.string().min(1),
  primaryTenantId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  monthlyRent: z.coerce.number().positive(),
  depositAmount: z.coerce.number().min(0),
  rentDueDay: z.coerce.number().int().min(1).max(28).default(1),
});

type FormData = z.infer<typeof schema>;

export function LeasesPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetLeasesQuery({});
  const { data: aptsData } = useGetApartmentsQuery({});
  const { data: tenantsData } = useGetTenantsQuery({});
  const [create, { isLoading: creating }] = useCreateLeaseMutation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { rentDueDay: 1 },
  });

  const onSubmit = async (d: FormData) => {
    await create(d);
    reset();
    setOpen(false);
  };

  const leases = (data?.data ?? []) as Lease[];
  const apartments = aptsData?.data ?? [];
  const tenants = tenantsData?.data ?? [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5">{t('leases.title')}</Typography>
        <Can permission="leases:create">
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>{t('leases.newLease')}</Button>
        </Can>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>}
      {error && <Alert severity="error">{t('leases.failedToLoad')}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('common.apartment')}</TableCell>
              <TableCell>{t('common.tenant')}</TableCell>
              <TableCell>{t('leases.start')}</TableCell>
              <TableCell>{t('leases.end')}</TableCell>
              <TableCell align="right">{t('leases.monthlyRent')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leases.map((l) => (
              <TableRow key={l.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/leases/${l.id}`)}>
                <TableCell>{l.apartment ? `${l.apartment.address}${l.apartment.unitNumber ? ` · ${l.apartment.unitNumber}` : ''}` : '—'}</TableCell>
                <TableCell>
                  {l.parties?.find((p) => p.isPrimary)?.tenant
                    ? `${l.parties.find((p) => p.isPrimary)!.tenant.firstName} ${l.parties.find((p) => p.isPrimary)!.tenant.lastName}`
                    : '—'}
                </TableCell>
                <TableCell>{formatDate(l.startDate)}</TableCell>
                <TableCell>{formatDate(l.endDate)}</TableCell>
                <TableCell align="right">{formatMoney(l.monthlyRent, l.currency)}</TableCell>
                <TableCell><StatusBadge status={l.status} /></TableCell>
              </TableRow>
            ))}
            {!isLoading && leases.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t('leases.noLeases')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('leases.createDialog')}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" error={!!errors.apartmentId}>
                  <InputLabel>{t('leases.apartmentLabel')}</InputLabel>
                  <Select {...register('apartmentId')} label={t('leases.apartmentLabel')} defaultValue="">
                    {apartments.filter((a) => a.status === 'VACANT').map((a) => (
                      <MenuItem key={a.id} value={a.id}>{a.address}{a.unitNumber ? ` · ${a.unitNumber}` : ''}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" error={!!errors.primaryTenantId}>
                  <InputLabel>{t('leases.primaryTenant')}</InputLabel>
                  <Select {...register('primaryTenantId')} label={t('leases.primaryTenant')} defaultValue="">
                    {tenants.map((tenant) => (
                      <MenuItem key={tenant.id} value={tenant.id}>{tenant.firstName} {tenant.lastName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('startDate')} label={t('leases.startDate')} type="date" fullWidth InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('endDate')} label={t('leases.endDate')} type="date" fullWidth InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('monthlyRent')} label={t('leases.monthlyRent')} type="number" fullWidth error={!!errors.monthlyRent} />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('depositAmount')} label={t('leases.depositAmount')} type="number" fullWidth />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('rentDueDay')} label={t('leases.rentDueDay')} type="number" fullWidth inputProps={{ min: 1, max: 28 }} />
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
