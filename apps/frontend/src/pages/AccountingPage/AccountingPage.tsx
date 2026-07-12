import React, { useState } from 'react';
import { Loader2, Lock, LockOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useGetLocksQuery,
  useLockPeriodMutation,
  useUnlockPeriodMutation,
  LockedPeriod,
} from '../../entities/accounting/api/accountingApi';
import { Can } from '../../shared/ui/Can';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Field } from '../../shared/ui/Field';
import { PageSpinner } from '../../shared/ui/Spinner';
import { formatDate } from '../../shared/utils/formatMoney';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    <div className="max-w-3xl">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('accounting.title')}</h1>
        <Can permission="accounting:update">
          <Button onClick={() => setOpen(true)}>
            <Lock className="mr-2 h-4 w-4" />
            {t('accounting.lockPeriod')}
          </Button>
        </Can>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">{t('accounting.subtitle')}</p>

      {isLoading && <PageSpinner />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t('accounting.failedToLoad')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('accounting.period')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead>{t('accounting.lockedAt')}</TableHead>
              <TableHead>{t('common.notes')}</TableHead>
              <TableHead className="text-right">{t('common.action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-semibold">{p.yearMonth}</TableCell>
                <TableCell>
                  <StatusBadge status={isActive(p) ? 'LOCKED' : 'UNLOCKED'} />
                </TableCell>
                <TableCell>{formatDate(p.lockedAt)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.note ?? '—'}</TableCell>
                <TableCell className="text-right">
                  {isActive(p) && (
                    <Can permission="accounting:update">
                      <Button size="sm" variant="ghost" onClick={() => onUnlock(p)}>
                        <LockOpen className="mr-2 h-4 w-4" />
                        {t('accounting.unlock')}
                      </Button>
                    </Can>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && periods.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {t('accounting.none')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('accounting.lockPeriod')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('accounting.lockHint')}</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('common.year')}>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('common.month')}>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label={t('common.notes')} htmlFor="acc-note">
              <Textarea id="acc-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onLock} disabled={locking}>
              {locking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('accounting.lockPeriod')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
