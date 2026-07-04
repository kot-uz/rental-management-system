import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { ArrowBack, Edit, Delete } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import {
  useGetTenantQuery,
  useUpdateTenantMutation,
  useDeleteTenantMutation,
} from '../../entities/tenants/api/tenantsApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { EntityTags } from '../../widgets/EntityTags/EntityTags';
import { DocumentsSection } from '../../widgets/DocumentsSection/DocumentsSection';
import { PhotosSection } from '../../widgets/PhotosSection/PhotosSection';
import { TelegramLinkButton } from '../../widgets/TelegramLink/TelegramLinkButton';
import { useLinkTenantTelegramMutation } from '../../entities/telegram/api/telegramApi';
import { formatMoney, formatDate } from '../../shared/utils/formatMoney';

type EditForm = {
  firstName: string;
  lastName: string;
  phone: string;
  idType: 'PASSPORT' | 'NATIONAL_ID' | 'OTHER';
  idNumber: string;
  telegram?: string;
  emergencyContact?: string;
  notes?: string;
};

export function TenantDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [tab, setTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, error } = useGetTenantQuery(id);
  const [updateTenant, { isLoading: saving }] = useUpdateTenantMutation();
  const [deleteTenant] = useDeleteTenantMutation();
  const [linkTenant] = useLinkTenantTelegramMutation();

  const { register, handleSubmit, reset } = useForm<EditForm>();

  const tenant = data?.data;
  const parties = tenant?.leaseParties ?? [];

  const idTypeLabel = (idType: string) =>
    idType === 'PASSPORT'
      ? t('tenants.idPassport')
      : idType === 'NATIONAL_ID'
        ? t('tenants.idNational')
        : t('tenants.idOther');

  const openEdit = () => {
    if (tenant) {
      reset({
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        phone: tenant.phone,
        idType: tenant.idType,
        idNumber: tenant.idNumber,
        telegram: tenant.telegram,
        emergencyContact: tenant.emergencyContact,
        notes: tenant.notes,
      });
      setEditOpen(true);
    }
  };

  const onSave = async (form: EditForm) => {
    await updateTenant({ id, data: form });
    setEditOpen(false);
  };

  const onDelete = async () => {
    await deleteTenant(id);
    setConfirmOpen(false);
    navigate('/tenants');
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );
  }
  if (error || !tenant) {
    return <Alert severity="error">{t('tenants.failedToLoad')}</Alert>;
  }

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/tenants')} sx={{ mb: 2 }}>
        {t('common.back')}
      </Button>

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={2}>
        <Box>
          <Typography variant="h5">
            {tenant.firstName} {tenant.lastName}
          </Typography>
          <Box mt={1}>
            <Chip
              size="small"
              color={tenant.isActive ? 'success' : 'default'}
              label={tenant.isActive ? t('tenants.statusActive') : t('tenants.statusInactive')}
            />
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Can permission="tenants:update">
            <Button variant="outlined" startIcon={<Edit />} onClick={openEdit}>
              {t('common.edit')}
            </Button>
          </Can>
          <Can permission="tenants:delete">
            <Button color="error" variant="outlined" startIcon={<Delete />} onClick={() => setConfirmOpen(true)}>
              {t('common.delete')}
            </Button>
          </Can>
        </Box>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
          <Tab label={t('common.overview')} />
          <Tab label={`${t('nav.leases')} (${parties.length})`} />
          <Tab label={t('tenants.photos')} />
          <Tab label={t('documents.title')} />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Detail label={t('common.phone')} value={tenant.phone} />
            <Detail label={t('tenants.idType')} value={idTypeLabel(tenant.idType)} />
            <Detail label={t('tenants.idNumber')} value={tenant.idNumber} />
            {tenant.telegram && <Detail label={t('tenants.telegram')} value={tenant.telegram} />}
            {tenant.emergencyContact && (
              <Detail label={t('tenants.emergencyContact')} value={tenant.emergencyContact} />
            )}
            <Detail label={t('tenants.added')} value={formatDate(tenant.createdAt)} />
            {tenant.notes && <Detail label={t('common.notes')} value={tenant.notes} full />}
          </Grid>
          <Box mt={3} pt={2} borderTop={1} borderColor="divider">
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              {t('tenants.telegramNotify')}
            </Typography>
            <TelegramLinkButton
              linked={!!tenant.telegramChatId}
              requestLink={async () => (await linkTenant(id).unwrap()).data}
            />
          </Box>
          <Box mt={3} pt={2} borderTop={1} borderColor="divider">
            <EntityTags entityType="tenant" entityId={id} />
          </Box>
        </Paper>
      )}

      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.apartment')}</TableCell>
                <TableCell>{t('leases.start')}</TableCell>
                <TableCell>{t('leases.end')}</TableCell>
                <TableCell align="right">{t('leases.monthlyRent')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {parties.map((p) => (
                <TableRow
                  key={p.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/leases/${p.lease.id}`)}
                >
                  <TableCell>
                    {p.lease.apartment
                      ? `${p.lease.apartment.address}${p.lease.apartment.unitNumber ? ` · ${p.lease.apartment.unitNumber}` : ''}`
                      : '—'}
                  </TableCell>
                  <TableCell>{formatDate(p.lease.startDate)}</TableCell>
                  <TableCell>{formatDate(p.lease.endDate)}</TableCell>
                  <TableCell align="right">{formatMoney(p.lease.monthlyRent, p.lease.currency)}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.lease.status} />
                  </TableCell>
                </TableRow>
              ))}
              {parties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {t('leases.noLeases')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 2 && (
        <Paper sx={{ p: 3 }}>
          <PhotosSection
            ownerType="tenant"
            ownerId={id}
            permission="tenants:update"
            purpose="tenant-photo"
            titleKey="tenants.photos"
            addKey="tenants.addPhoto"
            emptyKey="tenants.noPhotos"
          />
        </Paper>
      )}

      {tab === 3 && <DocumentsSection ownerType="tenant" ownerId={id} />}

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('common.edit')}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSave)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField {...register('firstName')} label={t('auth.firstName')} fullWidth />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('lastName')} label={t('auth.lastName')} fullWidth />
              </Grid>
              <Grid item xs={12}>
                <TextField {...register('phone')} label={t('common.phone')} fullWidth />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('tenants.idType')}</InputLabel>
                  <Select {...register('idType')} label={t('tenants.idType')} defaultValue={tenant.idType}>
                    <MenuItem value="PASSPORT">{t('tenants.idPassport')}</MenuItem>
                    <MenuItem value="NATIONAL_ID">{t('tenants.idNational')}</MenuItem>
                    <MenuItem value="OTHER">{t('tenants.idOther')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('idNumber')} label={t('tenants.idNumber')} fullWidth />
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
            <Button onClick={() => setEditOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? <CircularProgress size={20} /> : t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{t('common.delete')}</DialogTitle>
        <DialogContent>
          <Typography>{t('common.deleteConfirm')}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={onDelete}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Detail({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <Grid item xs={12} sm={full ? 12 : 6}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography>{value}</Typography>
    </Grid>
  );
}
