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
  useGetApartmentQuery,
  useUpdateApartmentMutation,
  useDeleteApartmentMutation,
} from '../../entities/apartments/api/apartmentsApi';
import { useGetLeasesQuery } from '../../entities/leases/api/leasesApi';
import { useGetRepairsQuery } from '../../entities/repairs/api/repairsApi';
import { useGetUtilitiesQuery } from '../../entities/utilities/api/utilitiesApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { DocumentsSection } from '../../widgets/DocumentsSection/DocumentsSection';
import { PhotosSection } from '../../widgets/PhotosSection/PhotosSection';
import { EntityTags } from '../../widgets/EntityTags/EntityTags';
import { formatMoney, formatDate, formatMonthYear } from '../../shared/utils/formatMoney';

type EditForm = {
  address: string;
  unitNumber?: string;
  floor?: number;
  rooms?: number;
  areaSqm?: number;
  status: string;
  notes?: string;
};

export function ApartmentDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [tab, setTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, error } = useGetApartmentQuery(id);
  const { data: leasesData } = useGetLeasesQuery({ apartmentId: id });
  const { data: repairsData } = useGetRepairsQuery({ apartmentId: id });
  const { data: utilitiesData } = useGetUtilitiesQuery({ apartmentId: id });
  const [updateApartment, { isLoading: saving }] = useUpdateApartmentMutation();
  const [deleteApartment] = useDeleteApartmentMutation();

  const { register, handleSubmit, reset } = useForm<EditForm>();

  const apt = data?.data;
  const leases = leasesData?.data ?? [];
  const repairs = repairsData?.data ?? [];
  const utilities = utilitiesData?.data ?? [];

  const openEdit = () => {
    if (apt) {
      reset({
        address: apt.address,
        unitNumber: apt.unitNumber,
        floor: apt.floor,
        rooms: apt.rooms,
        areaSqm: apt.areaSqm,
        status: apt.status,
        notes: apt.notes,
      });
      setEditOpen(true);
    }
  };

  const onSave = async (form: EditForm) => {
    await updateApartment({
      id,
      data: {
        ...form,
        floor: form.floor ? Number(form.floor) : undefined,
        rooms: form.rooms ? Number(form.rooms) : undefined,
        areaSqm: form.areaSqm ? Number(form.areaSqm) : undefined,
      } as never,
    });
    setEditOpen(false);
  };

  const onDelete = async () => {
    await deleteApartment(id);
    setConfirmOpen(false);
    navigate('/apartments');
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );
  }
  if (error || !apt) {
    return <Alert severity="error">{t('apartments.failedToLoad')}</Alert>;
  }

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/apartments')} sx={{ mb: 2 }}>
        {t('common.back')}
      </Button>

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={2}>
        <Box>
          <Typography variant="h5">
            {apt.address}
            {apt.unitNumber ? ` · ${apt.unitNumber}` : ''}
          </Typography>
          <Box mt={1}>
            <StatusBadge status={apt.status} />
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Can permission="apartments:update">
            <Button variant="outlined" startIcon={<Edit />} onClick={openEdit}>
              {t('common.edit')}
            </Button>
          </Can>
          <Can permission="apartments:delete">
            <Button color="error" variant="outlined" startIcon={<Delete />} onClick={() => setConfirmOpen(true)}>
              {t('common.delete')}
            </Button>
          </Can>
        </Box>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label={t('common.overview')} />
          <Tab label={`${t('nav.leases')} (${leases.length})`} />
          <Tab label={`${t('nav.repairs')} (${repairs.length})`} />
          <Tab label={`${t('nav.utilities')} (${utilities.length})`} />
          <Tab label={t('apartments.photos')} />
          <Tab label={t('documents.title')} />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Detail label={t('common.address')} value={`${apt.address}${apt.unitNumber ? ` · ${apt.unitNumber}` : ''}`} />
            {apt.floor != null && <Detail label={t('apartments.floor')} value={String(apt.floor)} />}
            {apt.rooms != null && <Detail label={t('apartments.rooms')} value={String(apt.rooms)} />}
            {apt.areaSqm != null && <Detail label={t('apartments.areaSqm')} value={`${apt.areaSqm} m²`} />}
            {apt.notes && <Detail label={t('common.notes')} value={apt.notes} full />}
          </Grid>
          <Box mt={3} pt={2} borderTop={1} borderColor="divider">
            <EntityTags entityType="apartment" entityId={id} />
          </Box>
        </Paper>
      )}

      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
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
                  <TableCell>
                    {l.parties?.find((p) => p.isPrimary)?.tenant
                      ? `${l.parties.find((p) => p.isPrimary)!.tenant.firstName} ${l.parties.find((p) => p.isPrimary)!.tenant.lastName}`
                      : '—'}
                  </TableCell>
                  <TableCell>{formatDate(l.startDate)}</TableCell>
                  <TableCell>{formatDate(l.endDate)}</TableCell>
                  <TableCell align="right">{formatMoney(l.monthlyRent, l.currency)}</TableCell>
                  <TableCell>
                    <StatusBadge status={l.status} />
                  </TableCell>
                </TableRow>
              ))}
              {leases.length === 0 && <EmptyRow colSpan={5} text={t('leases.noLeases')} />}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 2 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.description')}</TableCell>
                <TableCell>{t('repairs.severity')}</TableCell>
                <TableCell align="right">{t('repairs.costActual')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('common.date')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {repairs.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>{r.severity}</TableCell>
                  <TableCell align="right">{r.costActual != null ? formatMoney(r.costActual) : '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>{formatDate(r.createdAt)}</TableCell>
                </TableRow>
              ))}
              {repairs.length === 0 && <EmptyRow colSpan={5} text={t('repairs.noRepairs')} />}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 3 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.type')}</TableCell>
                <TableCell>{t('common.period')}</TableCell>
                <TableCell align="right">{t('common.amount')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {utilities.map((u) => (
                <TableRow key={u.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/utilities/${u.id}`)}>
                  <TableCell>{u.type}</TableCell>
                  <TableCell>{formatMonthYear(u.periodYear, u.periodMonth)}</TableCell>
                  <TableCell align="right">{formatMoney(u.amount)}</TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                </TableRow>
              ))}
              {utilities.length === 0 && <EmptyRow colSpan={4} text={t('utilities.noUtilities')} />}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 4 && (
        <Paper sx={{ p: 3 }}>
          <PhotosSection
            ownerType="apartment"
            ownerId={id}
            permission="apartments:update"
            purpose="apartment-photo"
            titleKey="apartments.photos"
            addKey="apartments.addPhoto"
            emptyKey="apartments.noPhotos"
          />
        </Paper>
      )}

      {tab === 5 && <DocumentsSection ownerType="apartment" ownerId={id} />}

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('common.edit')}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSave)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField {...register('address')} label={t('common.address')} fullWidth />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('unitNumber')} label={t('apartments.unitNumber')} fullWidth />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('common.status')}</InputLabel>
                  <Select {...register('status')} label={t('common.status')} defaultValue={apt.status}>
                    <MenuItem value="VACANT">{t('apartments.statusVacant')}</MenuItem>
                    <MenuItem value="OCCUPIED">{t('apartments.statusOccupied')}</MenuItem>
                    <MenuItem value="ARCHIVED">{t('apartments.statusArchived')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4}>
                <TextField {...register('floor')} label={t('apartments.floor')} type="number" fullWidth />
              </Grid>
              <Grid item xs={4}>
                <TextField {...register('rooms')} label={t('apartments.rooms')} type="number" fullWidth />
              </Grid>
              <Grid item xs={4}>
                <TextField {...register('areaSqm')} label={t('apartments.areaSqm')} type="number" fullWidth />
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

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} align="center" sx={{ py: 4, color: 'text.secondary' }}>
        {text}
      </TableCell>
    </TableRow>
  );
}
