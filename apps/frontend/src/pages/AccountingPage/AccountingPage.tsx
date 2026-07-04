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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { Lock, LockOpen } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  useGetLocksQuery,
  useLockPeriodMutation,
  useUnlockPeriodMutation,
  LockedPeriod,
} from '../../entities/accounting/api/accountingApi';
import { Can } from '../../shared/ui/Can';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { formatDate } from '../../shared/utils/formatMoney';

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

export function AccountingPage() {
  const { t } = useTranslation();
  const now = new Date();
  const { data, isLoading, error } = useGetLocksQuery();
  const [lockPeriod, { isLoading: locking }] = useLockPeriodMutation();
  const [unlockPeriod] = useUnlockPeriodMutation();

  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(String(now.getUTCMonth() + 1).padStart(2, '0'));
  const [note, setNote] = useState('');

  const periods = data?.data ?? [];
  const years = Array.from({ length: 6 }, (_, i) => now.getUTCFullYear() - 3 + i);

  const isActive = (p: LockedPeriod) => !p.unlockedAt;

  const onLock = async () => {
    await lockPeriod({ yearMonth: `${year}-${month}`, note: note || undefined }).unwrap();
    setOpen(false);
    setNote('');
  };

  const onUnlock = async (p: LockedPeriod) => {
    if (window.confirm(t('accounting.unlockConfirm', { period: p.yearMonth }))) {
      await unlockPeriod(p.yearMonth);
    }
  };

  return (
    <Box maxWidth={760}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={2}>
        <Typography variant="h5">{t('accounting.title')}</Typography>
        <Can permission="accounting:update">
          <Button variant="contained" startIcon={<Lock />} onClick={() => setOpen(true)}>
            {t('accounting.lockPeriod')}
          </Button>
        </Can>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {t('accounting.subtitle')}
      </Typography>

      {isLoading && <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>}
      {error && <Alert severity="error">{t('accounting.failedToLoad')}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('accounting.period')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell>{t('accounting.lockedAt')}</TableCell>
              <TableCell>{t('common.notes')}</TableCell>
              <TableCell align="right">{t('common.action')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {periods.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{p.yearMonth}</TableCell>
                <TableCell>
                  <StatusBadge status={isActive(p) ? 'LOCKED' : 'UNLOCKED'} />
                </TableCell>
                <TableCell>{formatDate(p.lockedAt)}</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{p.note ?? '—'}</TableCell>
                <TableCell align="right">
                  {isActive(p) && (
                    <Can permission="accounting:update">
                      <Button size="small" startIcon={<LockOpen />} onClick={() => onUnlock(p)}>
                        {t('accounting.unlock')}
                      </Button>
                    </Can>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && periods.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {t('accounting.none')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('accounting.lockPeriod')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2} mt={1}>
            {t('accounting.lockHint')}
          </Typography>
          <Box display="flex" gap={2} mb={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>{t('common.year')}</InputLabel>
              <Select value={year} label={t('common.year')} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>{t('common.month')}</InputLabel>
              <Select value={month} label={t('common.month')} onChange={(e) => setMonth(e.target.value)}>
                {MONTHS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <TextField label={t('common.notes')} value={note} onChange={(e) => setNote(e.target.value)} fullWidth multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={onLock} disabled={locking}>
            {locking ? <CircularProgress size={20} /> : t('accounting.lockPeriod')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
