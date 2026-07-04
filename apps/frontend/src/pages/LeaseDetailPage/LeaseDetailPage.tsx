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
  Divider,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import {
  useGetLeaseQuery,
  useAddDeductionMutation,
  useTerminateLeaseMutation,
  useSettleDepositMutation,
} from '../../entities/leases/api/leasesApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { EntityTags } from '../../widgets/EntityTags/EntityTags';
import { DocumentsSection } from '../../widgets/DocumentsSection/DocumentsSection';
import { formatMoney, formatDate, formatMonthYear } from '../../shared/utils/formatMoney';

export function LeaseDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [tab, setTab] = useState(0);
  const [deductOpen, setDeductOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);

  const { data, isLoading, error } = useGetLeaseQuery(id);
  const [addDeduction, { isLoading: addingDeduction }] = useAddDeductionMutation();
  const [terminateLease, { isLoading: terminating }] = useTerminateLeaseMutation();
  const [settleDeposit, { isLoading: settling }] = useSettleDepositMutation();

  const deductForm = useForm<{ amount: number; reason: string }>();
  const terminateForm = useForm<{ terminationNote: string; penaltyAmount?: number }>();
  const settleForm = useForm<{ returnAmount: number; note?: string }>();

  const lease = data?.data;
  const periods = lease?.rentPeriods ?? [];
  const deductions = lease?.deductions ?? [];
  const currency = lease?.currency ?? 'USD';

  const onAddDeduction = async (form: { amount: number; reason: string }) => {
    await addDeduction({ id, amount: Number(form.amount), reason: form.reason });
    deductForm.reset();
    setDeductOpen(false);
  };

  const onSettle = async (form: { returnAmount: number; note?: string }) => {
    await settleDeposit({ id, returnAmount: Number(form.returnAmount), note: form.note }).unwrap();
    settleForm.reset();
    setSettleOpen(false);
  };

  const onTerminate = async (form: { terminationNote: string; penaltyAmount?: number }) => {
    await terminateLease({
      id,
      data: {
        terminationNote: form.terminationNote,
        penaltyAmount: form.penaltyAmount ? Number(form.penaltyAmount) : undefined,
      },
    });
    terminateForm.reset();
    setTerminateOpen(false);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );
  }
  if (error || !lease) {
    return <Alert severity="error">{t('leases.failedToLoad')}</Alert>;
  }

  const apartmentLabel = lease.apartment
    ? `${lease.apartment.address}${lease.apartment.unitNumber ? ` · ${lease.apartment.unitNumber}` : ''}`
    : '—';

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/leases')} sx={{ mb: 2 }}>
        {t('common.back')}
      </Button>

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={2}>
        <Box>
          <Typography variant="h5">{apartmentLabel}</Typography>
          <Box mt={1}>
            <StatusBadge status={lease.status} />
          </Box>
        </Box>
        {lease.status === 'ACTIVE' && (
          <Can permission="leases:end">
            <Button color="error" variant="outlined" onClick={() => setTerminateOpen(true)}>
              {t('leases.terminate')}
            </Button>
          </Can>
        )}
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label={t('leases.terms')} />
          <Tab label={`${t('common.tenant')} (${lease.parties?.length ?? 0})`} />
          <Tab label={`${t('nav.rent')} (${periods.length})`} />
          <Tab label={t('leases.deposit')} />
          <Tab label={t('documents.title')} />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Detail label={t('common.apartment')} value={apartmentLabel} />
            <Detail label={t('leases.start')} value={formatDate(lease.startDate)} />
            <Detail label={t('leases.end')} value={formatDate(lease.endDate)} />
            <Detail label={t('leases.monthlyRent')} value={formatMoney(lease.monthlyRent, currency)} />
            <Detail label={t('leases.rentDueDay')} value={String(lease.rentDueDay)} />
            <Detail label={t('leases.depositAmount')} value={formatMoney(lease.depositAmount, currency)} />
            {lease.terminationNote && (
              <Detail label={t('leases.terminationNote')} value={lease.terminationNote} full />
            )}
          </Grid>
          <Box mt={3} pt={2} borderTop={1} borderColor="divider">
            <EntityTags entityType="lease" entityId={id} />
          </Box>
        </Paper>
      )}

      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.name')}</TableCell>
                <TableCell>{t('leases.primaryTenant')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(lease.parties ?? []).map((p) => (
                <TableRow key={p.tenant.id} hover>
                  <TableCell>
                    {p.tenant.firstName} {p.tenant.lastName}
                  </TableCell>
                  <TableCell>{p.isPrimary ? <Chip size="small" color="primary" label="★" /> : '—'}</TableCell>
                </TableRow>
              ))}
              {(lease.parties?.length ?? 0) === 0 && <EmptyRow colSpan={2} text="—" />}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 2 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common.period')}</TableCell>
                <TableCell>{t('rent.dueDate')}</TableCell>
                <TableCell align="right">{t('rent.expected')}</TableCell>
                <TableCell align="right">{t('rent.paid')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {periods.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>{formatMonthYear(p.periodYear, p.periodMonth)}</TableCell>
                  <TableCell>{formatDate(p.dueDate)}</TableCell>
                  <TableCell align="right">{formatMoney(p.expectedAmount, currency)}</TableCell>
                  <TableCell align="right">{formatMoney(p.paidAmount, currency)}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                </TableRow>
              ))}
              {periods.length === 0 && <EmptyRow colSpan={5} text={t('rent.noPeriods')} />}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 3 && (
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} flexWrap="wrap" gap={2}>
            <Grid container spacing={2} sx={{ flex: 1 }}>
              <Detail label={t('leases.depositAmount')} value={formatMoney(lease.depositAmount, currency)} />
              <Detail label={t('leases.depositBalance')} value={formatMoney(lease.depositBalance, currency)} />
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary" display="block">{t('leases.depositStatus')}</Typography>
                <StatusBadge status={lease.depositStatus} />
              </Grid>
              {lease.depositSettledAt && (
                <>
                  <Detail label={t('leases.depositReturned')} value={formatMoney(lease.depositReturnedAmount ?? 0, currency)} />
                  <Detail label={t('leases.depositSettledAt')} value={formatDate(lease.depositSettledAt)} />
                  {lease.depositSettlementNote && <Detail label={t('common.notes')} value={lease.depositSettlementNote} full />}
                </>
              )}
            </Grid>
            {!lease.depositSettledAt && (
              <Can permission="deposits:update">
                <Button variant="contained" onClick={() => { settleForm.reset({ returnAmount: Number(lease.depositBalance) }); setSettleOpen(true); }}>
                  {t('leases.settleDeposit')}
                </Button>
              </Can>
            )}
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle1">{t('leases.deductions')}</Typography>
            <Can permission="deposits:update">
              <Button size="small" variant="outlined" disabled={!!lease.depositSettledAt} onClick={() => setDeductOpen(true)}>
                {t('leases.addDeduction')}
              </Button>
            </Can>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.date')}</TableCell>
                  <TableCell>{t('leases.reason')}</TableCell>
                  <TableCell align="right">{t('common.amount')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deductions.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{formatDate(d.createdAt)}</TableCell>
                    <TableCell>{d.reason}</TableCell>
                    <TableCell align="right">{formatMoney(d.amount, currency)}</TableCell>
                  </TableRow>
                ))}
                {deductions.length === 0 && <EmptyRow colSpan={3} text={t('common.noRecords')} />}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {tab === 4 && <DocumentsSection ownerType="lease" ownerId={id} />}

      {/* Add deduction dialog */}
      <Dialog open={deductOpen} onClose={() => setDeductOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('leases.addDeduction')}</DialogTitle>
        <Box component="form" onSubmit={deductForm.handleSubmit(onAddDeduction)}>
          <DialogContent>
            <TextField
              {...deductForm.register('amount')}
              label={t('common.amount')}
              type="number"
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField {...deductForm.register('reason')} label={t('leases.reason')} fullWidth multiline rows={2} />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDeductOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={addingDeduction}>
              {addingDeduction ? <CircularProgress size={20} /> : t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Settle deposit dialog */}
      <Dialog open={settleOpen} onClose={() => setSettleOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('leases.settleDeposit')}</DialogTitle>
        <Box component="form" onSubmit={settleForm.handleSubmit(onSettle)}>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('leases.settleHint', { balance: formatMoney(lease.depositBalance, currency) })}
            </Typography>
            <TextField
              {...settleForm.register('returnAmount')}
              label={t('leases.returnAmount')}
              type="number"
              fullWidth
              inputProps={{ min: 0, max: Number(lease.depositBalance), step: '0.01' }}
              sx={{ mb: 2 }}
            />
            <TextField {...settleForm.register('note')} label={t('rent.note')} fullWidth multiline rows={2} />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setSettleOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={settling}>
              {settling ? <CircularProgress size={20} /> : t('leases.settleDeposit')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Terminate dialog */}
      <Dialog open={terminateOpen} onClose={() => setTerminateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('leases.terminate')}</DialogTitle>
        <Box component="form" onSubmit={terminateForm.handleSubmit(onTerminate)}>
          <DialogContent>
            <TextField
              {...terminateForm.register('terminationNote')}
              label={t('leases.terminationNote')}
              fullWidth
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />
            <TextField
              {...terminateForm.register('penaltyAmount')}
              label={t('leases.penaltyAmount')}
              type="number"
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setTerminateOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" color="error" variant="contained" disabled={terminating}>
              {terminating ? <CircularProgress size={20} /> : t('leases.terminate')}
            </Button>
          </DialogActions>
        </Box>
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
