import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
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
  Grid,
  TableContainer,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetTenantsQuery, useCreateTenantMutation, Tenant } from '../../entities/tenants/api/tenantsApi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDate } from '../../shared/utils/formatMoney';
import { Can } from '../../shared/ui/Can';

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  idType: z.enum(['PASSPORT', 'NATIONAL_ID', 'OTHER']).default('PASSPORT'),
  idNumber: z.string().min(1),
  telegram: z.string().optional(),
  emergencyContact: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function TenantsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetTenantsQuery({ search: search || undefined });
  const [create, { isLoading: creating }] = useCreateTenantMutation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { idType: 'PASSPORT' },
  });

  const onSubmit = async (d: FormData) => {
    await create(d);
    reset();
    setOpen(false);
  };

  const tenants = (data?.data ?? []) as Tenant[];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5">{t('tenants.title')}</Typography>
        <Can permission="tenants:create">
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>{t('tenants.addTenant')}</Button>
        </Can>
      </Box>

      <TextField
        placeholder={t('tenants.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
        sx={{ mb: 3, width: 280 }}
      />

      {isLoading && <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>}
      {error && <Alert severity="error">{t('tenants.failedToLoad')}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('common.name')}</TableCell>
              <TableCell>{t('common.phone')}</TableCell>
              <TableCell>{t('tenants.idType')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell>{t('tenants.added')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/tenants/${tenant.id}`)}>
                <TableCell>{tenant.firstName} {tenant.lastName}</TableCell>
                <TableCell>{tenant.phone}</TableCell>
                <TableCell>{tenant.idType}</TableCell>
                <TableCell>{tenant.isActive ? t('tenants.statusActive') : t('tenants.statusInactive')}</TableCell>
                <TableCell>{formatDate(tenant.createdAt)}</TableCell>
              </TableRow>
            ))}
            {!isLoading && tenants.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t('tenants.noTenants')}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('tenants.addDialog')}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField {...register('firstName')} label={t('auth.firstName')} fullWidth error={!!errors.firstName} helperText={errors.firstName?.message} />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('lastName')} label={t('auth.lastName')} fullWidth error={!!errors.lastName} helperText={errors.lastName?.message} />
              </Grid>
              <Grid item xs={12}>
                <TextField {...register('phone')} label={t('common.phone')} fullWidth error={!!errors.phone} helperText={errors.phone?.message} />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('tenants.idType')}</InputLabel>
                  <Select {...register('idType')} label={t('tenants.idType')} defaultValue="PASSPORT">
                    <MenuItem value="PASSPORT">{t('tenants.idPassport')}</MenuItem>
                    <MenuItem value="NATIONAL_ID">{t('tenants.idNational')}</MenuItem>
                    <MenuItem value="OTHER">{t('tenants.idOther')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('idNumber')} label={t('tenants.idNumber')} fullWidth error={!!errors.idNumber} helperText={errors.idNumber?.message} />
              </Grid>
              <Grid item xs={12}>
                <TextField {...register('telegram')} label={t('tenants.telegram')} fullWidth placeholder="@username" />
              </Grid>
              <Grid item xs={12}>
                <TextField {...register('emergencyContact')} label={t('tenants.emergencyContact')} fullWidth />
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
