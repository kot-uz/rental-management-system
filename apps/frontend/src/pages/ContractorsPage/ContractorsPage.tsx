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
  Chip,
  IconButton,
} from '@mui/material';
import { Add, Search, Delete } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGetContractorsQuery,
  useCreateContractorMutation,
  useDeleteContractorMutation,
  Contractor,
} from '../../entities/contractors/api/contractorsApi';
import { EntityTags } from '../../widgets/EntityTags/EntityTags';
import { DocumentsSection } from '../../widgets/DocumentsSection/DocumentsSection';
import { PhotosSection } from '../../widgets/PhotosSection/PhotosSection';
import { formatDate } from '../../shared/utils/formatMoney';
import { Can } from '../../shared/ui/Can';

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  telegram: z.string().optional(),
  specialty: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function ContractorsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Contractor | null>(null);

  const { data, isLoading, error } = useGetContractorsQuery({ search: search || undefined });
  const [create, { isLoading: creating }] = useCreateContractorMutation();
  const [remove] = useDeleteContractorMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (d: FormData) => {
    const payload = { ...d, email: d.email || undefined };
    await create(payload);
    reset();
    setOpen(false);
  };

  const contractors = (data?.data ?? []) as Contractor[];

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Typography variant="h5">{t('contractors.title')}</Typography>
        <Can permission="contractors:create">
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            {t('contractors.addContractor')}
          </Button>
        </Can>
      </Box>

      <TextField
        placeholder={t('contractors.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
        sx={{ mb: 3, width: 280 }}
      />

      {isLoading && (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{t('contractors.failedToLoad')}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('common.name')}</TableCell>
              <TableCell>{t('contractors.specialty')}</TableCell>
              <TableCell>{t('common.phone')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell align="right">{t('common.action')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contractors.map((c) => (
              <TableRow key={c.id} hover sx={{ cursor: 'pointer' }}>
                <TableCell onClick={() => setSelected(c)}>{c.name}</TableCell>
                <TableCell onClick={() => setSelected(c)}>{c.specialty ?? '—'}</TableCell>
                <TableCell onClick={() => setSelected(c)}>{c.phone ?? '—'}</TableCell>
                <TableCell onClick={() => setSelected(c)}>
                  <Chip
                    label={c.isActive ? t('contractors.statusActive') : t('contractors.statusInactive')}
                    color={c.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Can permission="contractors:delete">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        void remove(c.id);
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Can>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && contractors.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {t('contractors.noContractors')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('contractors.details')}</DialogTitle>
        <DialogContent>
          {selected && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t('common.name')}
                </Typography>
                <Typography>{selected.name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t('contractors.specialty')}
                </Typography>
                <Typography>{selected.specialty ?? '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t('common.phone')}
                </Typography>
                <Typography>{selected.phone ?? '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t('contractors.email')}
                </Typography>
                <Typography>{selected.email ?? '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  {t('contractors.telegram')}
                </Typography>
                <Typography>{selected.telegram ?? '—'}</Typography>
              </Grid>
              {selected.notes && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    {t('common.notes')}
                  </Typography>
                  <Typography>{selected.notes}</Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  {t('contractors.recentRepairs')}
                </Typography>
                {selected.repairs && selected.repairs.length > 0 ? (
                  selected.repairs.map((r) => (
                    <Typography key={r.id} variant="body2">
                      • {r.title} — {r.status}
                    </Typography>
                  ))
                ) : (
                  <Typography>—</Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <Box mb={2}>
                  <EntityTags entityType="contractor" entityId={selected.id} />
                </Box>
                <Box mb={2}>
                  <PhotosSection
                    ownerType="contractor"
                    ownerId={selected.id}
                    permission="contractors:update"
                    purpose="contractor-photo"
                    titleKey="contractors.photos"
                    addKey="contractors.addPhoto"
                    emptyKey="contractors.noPhotos"
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">{t('documents.title')}</Typography>
                <DocumentsSection ownerType="contractor" ownerId={selected.id} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelected(null)}>{t('common.back')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('contractors.addDialog')}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  {...register('name')}
                  label={t('common.name')}
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('phone')} label={t('common.phone')} fullWidth />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  {...register('email')}
                  label={t('contractors.email')}
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('telegram')} label={t('contractors.telegram')} fullWidth placeholder="@username" />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('specialty')} label={t('contractors.specialty')} fullWidth />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  {...register('notes')}
                  label={t('common.notes')}
                  fullWidth
                  multiline
                  rows={2}
                />
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
