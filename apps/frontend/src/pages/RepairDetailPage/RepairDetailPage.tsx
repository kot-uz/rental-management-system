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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { ArrowBack, Edit, Delete } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import {
  useGetRepairQuery,
  useUpdateRepairMutation,
  useTransitionRepairMutation,
  useAddRepairCommentMutation,
  useDeleteRepairMutation,
} from '../../entities/repairs/api/repairsApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { EntityTags } from '../../widgets/EntityTags/EntityTags';
import { PhotosSection } from '../../widgets/PhotosSection/PhotosSection';
import { formatMoney, formatDate } from '../../shared/utils/formatMoney';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELED'] as const;

type EditForm = {
  title: string;
  description?: string;
  severity: string;
  location?: string;
  costEstimate?: number;
  costActual?: number;
  contractorName?: string;
};

export function RepairDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [tab, setTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [comment, setComment] = useState('');

  const { data, isLoading, error } = useGetRepairQuery(id);
  const [updateRepair, { isLoading: saving }] = useUpdateRepairMutation();
  const [transitionRepair] = useTransitionRepairMutation();
  const [addComment, { isLoading: commenting }] = useAddRepairCommentMutation();
  const [deleteRepair] = useDeleteRepairMutation();

  const { register, handleSubmit, reset } = useForm<EditForm>();

  const repair = data?.data;
  const comments = repair?.comments ?? [];

  const statusLabel = (s: string) =>
    t(`repairs.status${s.split('_').map((w) => w[0] + w.slice(1).toLowerCase()).join('')}`);

  const openEdit = () => {
    if (repair) {
      reset({
        title: repair.title,
        description: repair.description,
        severity: repair.severity,
        location: repair.location,
        costEstimate: repair.costEstimate,
        costActual: repair.costActual,
        contractorName: repair.contractorName,
      });
      setEditOpen(true);
    }
  };

  const onSave = async (form: EditForm) => {
    await updateRepair({
      id,
      data: {
        ...form,
        costEstimate: form.costEstimate ? Number(form.costEstimate) : undefined,
        costActual: form.costActual ? Number(form.costActual) : undefined,
      },
    });
    setEditOpen(false);
  };

  const onAddComment = async () => {
    if (!comment.trim()) return;
    await addComment({ id, body: comment.trim() });
    setComment('');
  };

  const onDelete = async () => {
    await deleteRepair(id);
    setConfirmOpen(false);
    navigate('/repairs');
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );
  }
  if (error || !repair) {
    return <Alert severity="error">{t('repairs.failedToLoad')}</Alert>;
  }

  const apartmentLabel = repair.apartment
    ? `${repair.apartment.address}${repair.apartment.unitNumber ? ` · ${repair.apartment.unitNumber}` : ''}`
    : '—';

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/repairs')} sx={{ mb: 2 }}>
        {t('common.back')}
      </Button>

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={2}>
        <Box>
          <Typography variant="h5">{repair.title}</Typography>
          <Box mt={1} display="flex" gap={1}>
            <StatusBadge status={repair.severity} />
            <StatusBadge status={repair.status} />
          </Box>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Can permission="repairs:update.operational">
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>{t('repairs.changeStatus')}</InputLabel>
              <Select
                value={repair.status}
                label={t('repairs.changeStatus')}
                onChange={(e) => transitionRepair({ id, status: e.target.value })}
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {statusLabel(s)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Can>
          <Can permission="repairs:update.operational">
            <Button variant="outlined" startIcon={<Edit />} onClick={openEdit}>
              {t('common.edit')}
            </Button>
          </Can>
          <Can permission="repairs:delete">
            <Button color="error" variant="outlined" startIcon={<Delete />} onClick={() => setConfirmOpen(true)}>
              {t('common.delete')}
            </Button>
          </Can>
        </Box>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
          <Tab label={t('repairs.details')} />
          <Tab label={t('repairs.photos')} />
          <Tab label={`${t('repairs.comments')} (${comments.length})`} />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Detail label={t('common.apartment')} value={apartmentLabel} />
            <Detail label={t('repairs.severity')} value={repair.severity} />
            <Detail label={t('common.status')} value={statusLabel(repair.status)} />
            {repair.location && <Detail label={t('repairs.location')} value={repair.location} />}
            {repair.costEstimate != null && (
              <Detail label={t('repairs.costEstimate')} value={formatMoney(repair.costEstimate)} />
            )}
            {repair.costActual != null && (
              <Detail label={t('repairs.costActual')} value={formatMoney(repair.costActual)} />
            )}
            {repair.contractorName && (
              <Detail label={t('repairs.contractorName')} value={repair.contractorName} />
            )}
            <Detail label={t('repairs.created')} value={formatDate(repair.createdAt)} />
            {repair.description && <Detail label={t('common.description')} value={repair.description} full />}
          </Grid>
          <Box mt={3} pt={2} borderTop={1} borderColor="divider">
            <EntityTags entityType="repair" entityId={id} />
          </Box>
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 3 }}>
          <PhotosSection ownerType="repair" ownerId={id} />
        </Paper>
      )}

      {tab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Can permission="repairs:comment">
            <Box display="flex" gap={1} mb={2}>
              <TextField
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('repairs.addComment')}
                fullWidth
                size="small"
                multiline
              />
              <Button variant="contained" onClick={onAddComment} disabled={commenting || !comment.trim()}>
                {commenting ? <CircularProgress size={20} /> : t('common.save')}
              </Button>
            </Box>
          </Can>
          <Divider />
          <List>
            {comments.map((c) => (
              <ListItem key={c.id} alignItems="flex-start" disableGutters>
                <ListItemText primary={c.body} secondary={formatDate(c.createdAt)} />
              </ListItem>
            ))}
            {comments.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                {t('repairs.noComments')}
              </Typography>
            )}
          </List>
        </Paper>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('common.edit')}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSave)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField {...register('title')} label={t('repairs.titleField')} fullWidth />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('repairs.severity')}</InputLabel>
                  <Select {...register('severity')} label={t('repairs.severity')} defaultValue={repair.severity}>
                    <MenuItem value="LOW">{t('repairs.severityLow')}</MenuItem>
                    <MenuItem value="MEDIUM">{t('repairs.severityMedium')}</MenuItem>
                    <MenuItem value="HIGH">{t('repairs.severityHigh')}</MenuItem>
                    <MenuItem value="CRITICAL">{t('repairs.severityCritical')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('location')} label={t('repairs.location')} fullWidth />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('costEstimate')} label={t('repairs.costEstimate')} type="number" fullWidth />
              </Grid>
              <Grid item xs={6}>
                <TextField {...register('costActual')} label={t('repairs.costActual')} type="number" fullWidth />
              </Grid>
              <Grid item xs={12}>
                <TextField {...register('contractorName')} label={t('repairs.contractorName')} fullWidth />
              </Grid>
              <Grid item xs={12}>
                <TextField {...register('description')} label={t('common.description')} fullWidth multiline rows={2} />
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
