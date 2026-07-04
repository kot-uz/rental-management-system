import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TableContainer,
  Snackbar,
  Alert,
} from '@mui/material';
import { FileDownload } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useGetRentPeriodsQuery, useGetOverdueRentQuery, useRecordPaymentMutation, RentPeriod } from '../../entities/rent/api/rentApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { useAppSelector } from '../../shared/hooks/useAppSelector';
import { downloadFile } from '../../shared/utils/download';
import { formatMoney, formatDate, formatMonthYear } from '../../shared/utils/formatMoney';
import { useForm } from 'react-hook-form';

export function RentPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<RentPeriod | null>(null);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const token = useAppSelector((s) => s.auth.accessToken);
  const { data: allData, isLoading } = useGetRentPeriodsQuery({});
  const { data: overdueData } = useGetOverdueRentQuery();
  const [recordPayment, { isLoading: recording }] = useRecordPaymentMutation();

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { amount: '', paymentDate: new Date().toISOString().split('T')[0], method: 'CASH', note: '' },
  });

  const periods = (tab === 0 ? allData?.data : overdueData?.data) ?? [];

  const onRecord = async (data: { amount: string; paymentDate: string; method: string; note: string }) => {
    if (!selectedPeriod) return;
    try {
      const result = (await recordPayment({
        periodId: selectedPeriod.id,
        data: { ...data, amount: parseFloat(data.amount) },
      }).unwrap()) as { data?: { id?: string } };
      reset();
      setSelectedPeriod(null);
      if (result?.data?.id) setReceiptPaymentId(result.data.id);
    } catch (e) {
      const err = e as { status?: number; data?: { error?: { code?: string } } };
      setPayError(
        err.data?.error?.code === 'CONFLICT_002' ? t('rent.periodLocked') : t('rent.paymentFailed'),
      );
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5">{t('rent.title')}</Typography>
        <Can permission="rent:export">
          <Button variant="outlined" startIcon={<FileDownload />} onClick={() => downloadFile('/reports/rent.csv', token)}>
            {t('common.exportCsv')}
          </Button>
        </Can>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={t('rent.allPeriods')} />
        <Tab label={t('rent.overdue', { count: overdueData?.data?.length ?? 0 })} />
      </Tabs>

      {isLoading && <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('common.apartment')}</TableCell>
              <TableCell>{t('common.tenant')}</TableCell>
              <TableCell>{t('rent.periodLabel')}</TableCell>
              <TableCell>{t('rent.dueDate')}</TableCell>
              <TableCell align="right">{t('rent.expected')}</TableCell>
              <TableCell align="right">{t('rent.paid')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell>{t('common.action')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(periods as RentPeriod[]).map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>{p.lease?.apartment?.address ?? '—'}</TableCell>
                <TableCell>
                  {p.lease?.parties?.[0]?.tenant
                    ? `${p.lease.parties[0].tenant.firstName} ${p.lease.parties[0].tenant.lastName}`
                    : '—'}
                </TableCell>
                <TableCell>{formatMonthYear(p.periodYear, p.periodMonth)}</TableCell>
                <TableCell>{formatDate(p.dueDate)}</TableCell>
                <TableCell align="right">{formatMoney(p.expectedAmount)}</TableCell>
                <TableCell align="right">{formatMoney(p.paidAmount)}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell>
                  {p.status !== 'PAID' && p.status !== 'VOIDED' && (
                    <Button size="small" variant="outlined" onClick={() => setSelectedPeriod(p)}>
                      {t('rent.recordPayment')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && periods.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t('rent.noRecords')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!selectedPeriod} onClose={() => setSelectedPeriod(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('rent.recordPayment')}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onRecord)}>
          <DialogContent>
            {selectedPeriod && (
              <Typography variant="body2" color="text.secondary" mb={2}>
                {t('rent.remaining', { amount: formatMoney(selectedPeriod.expectedAmount - selectedPeriod.paidAmount) })}
              </Typography>
            )}
            <TextField {...register('amount')} label={t('common.amount')} type="number" fullWidth sx={{ mb: 2 }} required />
            <TextField {...register('paymentDate')} label={t('rent.paymentDate')} type="date" fullWidth sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} />
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>{t('rent.method')}</InputLabel>
              <Select {...register('method')} label={t('rent.method')} defaultValue="CASH">
                <MenuItem value="CASH">{t('rent.methodCash')}</MenuItem>
                <MenuItem value="BANK_TRANSFER">{t('rent.methodBankTransfer')}</MenuItem>
                <MenuItem value="CARD">{t('rent.methodCard')}</MenuItem>
              </Select>
            </FormControl>
            <TextField {...register('note')} label={t('rent.note')} fullWidth />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setSelectedPeriod(null)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={recording}>
              {recording ? <CircularProgress size={20} /> : t('rent.record')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Snackbar
        open={!!receiptPaymentId}
        autoHideDuration={8000}
        onClose={() => setReceiptPaymentId(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          onClose={() => setReceiptPaymentId(null)}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<FileDownload />}
              onClick={() => receiptPaymentId && downloadFile(`/reports/payments/${receiptPaymentId}/receipt.pdf`, token)}
            >
              {t('rent.downloadReceipt')}
            </Button>
          }
        >
          {t('rent.paymentRecorded')}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!payError}
        autoHideDuration={5000}
        onClose={() => setPayError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setPayError(null)}>{payError}</Alert>
      </Snackbar>
    </Box>
  );
}
