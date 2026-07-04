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
  TableContainer,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Switch,
  IconButton,
  Tooltip,
  Snackbar,
} from '@mui/material';
import { Add, Delete, Send, History } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGetWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  useTestWebhookMutation,
  useGetWebhookDeliveriesQuery,
  WebhookEndpoint,
  WEBHOOK_EVENTS,
} from '../../entities/webhooks/api/webhooksApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { formatDate } from '../../shared/utils/formatMoney';

const schema = z.object({
  url: z.string().url(),
  secret: z.string().min(8),
  events: z.array(z.string()).min(1),
});
type FormData = z.infer<typeof schema>;

function DeliveriesDialog({ endpoint, onClose }: { endpoint: WebhookEndpoint; onClose: () => void }) {
  const { t } = useTranslation();
  const { data, isLoading } = useGetWebhookDeliveriesQuery(endpoint.id);
  const deliveries = data?.data ?? [];
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('webhooks.deliveriesTitle')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2} sx={{ wordBreak: 'break-all' }}>
          {endpoint.url}
        </Typography>
        {isLoading && <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.date')}</TableCell>
                <TableCell>{t('webhooks.event')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="right">{t('webhooks.attempts')}</TableCell>
                <TableCell align="right">HTTP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deliveries.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell>{formatDate(d.createdAt)}</TableCell>
                  <TableCell><Chip label={d.eventType} size="small" variant="outlined" /></TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                  <TableCell align="right">{d.attempts}</TableCell>
                  <TableCell align="right">{d.responseStatus ?? '—'}</TableCell>
                </TableRow>
              ))}
              {!isLoading && deliveries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {t('webhooks.noDeliveries')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
}

export function WebhooksPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const [deliveriesFor, setDeliveriesFor] = useState<WebhookEndpoint | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { data, isLoading, error } = useGetWebhooksQuery();
  const [create, { isLoading: creating }] = useCreateWebhookMutation();
  const [update] = useUpdateWebhookMutation();
  const [remove] = useDeleteWebhookMutation();
  const [test] = useTestWebhookMutation();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { url: '', secret: '', events: [] },
  });
  const selectedEvents = watch('events');

  const endpoints = data?.data ?? [];

  const toggleEvent = (ev: string) => {
    const next = selectedEvents.includes(ev)
      ? selectedEvents.filter((e) => e !== ev)
      : [...selectedEvents, ev];
    setValue('events', next, { shouldValidate: true });
  };

  const onSubmit = async (form: FormData) => {
    await create({ ...form, active: true }).unwrap();
    reset();
    setOpen(false);
    setToast(t('webhooks.created'));
  };

  const onTest = async (id: string) => {
    await test(id).unwrap();
    setToast(t('webhooks.testSent'));
  };

  const onToggleActive = async (ep: WebhookEndpoint) => {
    await update({ id: ep.id, data: { active: !ep.isActive } });
  };

  const onDelete = async (id: string) => {
    if (window.confirm(t('webhooks.deleteConfirm'))) await remove(id);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={2}>
        <Typography variant="h5">{t('webhooks.title')}</Typography>
        <Can permission="webhooks:create">
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            {t('webhooks.add')}
          </Button>
        </Can>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {t('webhooks.subtitle')}
      </Typography>

      {isLoading && <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>}
      {error && <Alert severity="error">{t('webhooks.failedToLoad')}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>URL</TableCell>
              <TableCell>{t('webhooks.events')}</TableCell>
              <TableCell>{t('webhooks.active')}</TableCell>
              <TableCell align="right">{t('common.action')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {endpoints.map((ep) => (
              <TableRow key={ep.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{ep.url}</TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {ep.events.map((e) => <Chip key={e} label={e} size="small" variant="outlined" />)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Can permission="webhooks:update" fallback={<StatusBadge status={ep.isActive ? 'ACTIVE' : 'ARCHIVED'} />}>
                    <Switch checked={ep.isActive} onChange={() => onToggleActive(ep)} size="small" />
                  </Can>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={t('webhooks.viewDeliveries')}>
                    <IconButton size="small" onClick={() => setDeliveriesFor(ep)}><History fontSize="small" /></IconButton>
                  </Tooltip>
                  <Can permission="webhooks:update">
                    <Tooltip title={t('webhooks.test')}>
                      <IconButton size="small" onClick={() => onTest(ep.id)}><Send fontSize="small" /></IconButton>
                    </Tooltip>
                  </Can>
                  <Can permission="webhooks:delete">
                    <Tooltip title={t('common.delete')}>
                      <IconButton size="small" color="error" onClick={() => onDelete(ep.id)}><Delete fontSize="small" /></IconButton>
                    </Tooltip>
                  </Can>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && endpoints.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {t('webhooks.none')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('webhooks.add')}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <TextField
              {...register('url')}
              label={t('webhooks.url')}
              fullWidth
              sx={{ mb: 2 }}
              placeholder="https://example.com/hooks/rental"
              error={!!errors.url}
              helperText={errors.url?.message}
            />
            <TextField
              {...register('secret')}
              label={t('webhooks.secret')}
              fullWidth
              sx={{ mb: 2 }}
              error={!!errors.secret}
              helperText={errors.secret?.message ?? t('webhooks.secretHint')}
            />
            <Typography variant="subtitle2" mb={1}>{t('webhooks.events')}</Typography>
            <FormGroup>
              {WEBHOOK_EVENTS.map((ev) => (
                <FormControlLabel
                  key={ev}
                  control={<Checkbox size="small" checked={selectedEvents.includes(ev)} onChange={() => toggleEvent(ev)} />}
                  label={<Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{ev}</Typography>}
                />
              ))}
            </FormGroup>
            {errors.events && <Typography variant="caption" color="error">{t('webhooks.selectAtLeastOne')}</Typography>}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={creating}>
              {creating ? <CircularProgress size={20} /> : t('common.create')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {deliveriesFor && <DeliveriesDialog endpoint={deliveriesFor} onClose={() => setDeliveriesFor(null)} />}

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast(null)}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
