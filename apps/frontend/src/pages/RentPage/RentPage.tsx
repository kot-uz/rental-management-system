import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import {
  useGetRentPeriodsQuery,
  useGetOverdueRentQuery,
  useRecordPaymentMutation,
  RentPeriod,
} from '../../entities/rent/api/rentApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { Field } from '../../shared/ui/Field';
import { PageSpinner } from '../../shared/ui/Spinner';
import { useAppSelector } from '../../shared/hooks/useAppSelector';
import { downloadFile } from '../../shared/utils/download';
import { formatMoney, formatDate, formatMonthYear } from '../../shared/utils/formatMoney';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export function RentPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState<RentPeriod | null>(null);

  const token = useAppSelector((s) => s.auth.accessToken);
  const { data: allData, isLoading } = useGetRentPeriodsQuery({});
  const { data: overdueData } = useGetOverdueRentQuery();
  const [recordPayment, { isLoading: recording }] = useRecordPaymentMutation();

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'CASH',
      note: '',
    },
  });

  const periods = (tab === 'all' ? allData?.data : overdueData?.data) ?? [];

  const onRecord = async (data: { amount: string; paymentDate: string; method: string; note: string }) => {
    if (!selectedPeriod) return;
    try {
      const result = (await recordPayment({
        periodId: selectedPeriod.id,
        data: { ...data, amount: parseFloat(data.amount) },
      }).unwrap()) as { data?: { id?: string } };
      reset();
      setSelectedPeriod(null);
      const paymentId = result?.data?.id;
      toast.success(t('rent.paymentRecorded'), {
        duration: 8000,
        action: paymentId
          ? {
              label: t('rent.downloadReceipt'),
              onClick: () => downloadFile(`/reports/payments/${paymentId}/receipt.pdf`, token),
            }
          : undefined,
      });
    } catch (e) {
      const err = e as { status?: number; data?: { error?: { code?: string } } };
      toast.error(
        err.data?.error?.code === 'CONFLICT_002' ? t('rent.periodLocked') : t('rent.paymentFailed'),
      );
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('rent.title')}</h1>
        <Can permission="rent:export">
          <Button variant="outline" onClick={() => downloadFile('/reports/rent.csv', token)}>
            <Download className="mr-2 h-4 w-4" />
            {t('common.exportCsv')}
          </Button>
        </Can>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">{t('rent.allPeriods')}</TabsTrigger>
          <TabsTrigger value="overdue">
            {t('rent.overdue', { count: overdueData?.data?.length ?? 0 })}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && <PageSpinner />}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.apartment')}</TableHead>
              <TableHead>{t('common.tenant')}</TableHead>
              <TableHead>{t('rent.periodLabel')}</TableHead>
              <TableHead>{t('rent.dueDate')}</TableHead>
              <TableHead className="text-right">{t('rent.expected')}</TableHead>
              <TableHead className="text-right">{t('rent.paid')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead>{t('common.action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(periods as RentPeriod[]).map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.lease?.apartment?.address ?? '—'}</TableCell>
                <TableCell>
                  {p.lease?.parties?.[0]?.tenant
                    ? `${p.lease.parties[0].tenant.firstName} ${p.lease.parties[0].tenant.lastName}`
                    : '—'}
                </TableCell>
                <TableCell>{formatMonthYear(p.periodYear, p.periodMonth)}</TableCell>
                <TableCell>{formatDate(p.dueDate)}</TableCell>
                <TableCell className="text-right">{formatMoney(p.expectedAmount)}</TableCell>
                <TableCell className="text-right">{formatMoney(p.paidAmount)}</TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
                <TableCell>
                  {p.status !== 'PAID' && p.status !== 'VOIDED' && (
                    <Button size="sm" variant="outline" onClick={() => setSelectedPeriod(p)}>
                      {t('rent.recordPayment')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && periods.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  {t('rent.noRecords')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedPeriod} onOpenChange={(o) => !o && setSelectedPeriod(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('rent.recordPayment')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onRecord)} className="space-y-4">
            {selectedPeriod && (
              <p className="text-sm text-muted-foreground">
                {t('rent.remaining', {
                  amount: formatMoney(selectedPeriod.expectedAmount - selectedPeriod.paidAmount),
                })}
              </p>
            )}
            <Field label={t('common.amount')} htmlFor="rp-amount">
              <Input id="rp-amount" type="number" step="0.01" required {...register('amount')} />
            </Field>
            <Field label={t('rent.paymentDate')} htmlFor="rp-date">
              <Input id="rp-date" type="date" {...register('paymentDate')} />
            </Field>
            <Field label={t('rent.method')}>
              <Select value={watch('method')} onValueChange={(v) => setValue('method', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{t('rent.methodCash')}</SelectItem>
                  <SelectItem value="BANK_TRANSFER">{t('rent.methodBankTransfer')}</SelectItem>
                  <SelectItem value="CARD">{t('rent.methodCard')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('rent.note')} htmlFor="rp-note">
              <Input id="rp-note" {...register('note')} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setSelectedPeriod(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={recording}>
                {recording && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('rent.record')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
