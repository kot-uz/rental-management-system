import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Star } from 'lucide-react';
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
import { Field } from '../../shared/ui/Field';
import { PageSpinner } from '../../shared/ui/Spinner';
import { BackButton, DetailItem, EmptyRow } from '../../shared/ui/DetailBits';
import { EntityTags } from '../../widgets/EntityTags/EntityTags';
import { DocumentsSection } from '../../widgets/DocumentsSection/DocumentsSection';
import { formatMoney, formatDate, formatMonthYear } from '../../shared/utils/formatMoney';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export function LeaseDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
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

  if (isLoading) return <PageSpinner />;
  if (error || !lease) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t('leases.failedToLoad')}</AlertDescription>
      </Alert>
    );
  }

  const apartmentLabel = lease.apartment
    ? `${lease.apartment.address}${lease.apartment.unitNumber ? ` · ${lease.apartment.unitNumber}` : ''}`
    : '—';

  return (
    <div>
      <BackButton onClick={() => navigate('/app/leases')} />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{apartmentLabel}</h1>
          <div className="mt-2">
            <StatusBadge status={lease.status} />
          </div>
        </div>
        {lease.status === 'ACTIVE' && (
          <Can permission="leases:end">
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setTerminateOpen(true)}
            >
              {t('leases.terminate')}
            </Button>
          </Can>
        )}
      </div>

      <Tabs defaultValue="terms">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="terms">{t('leases.terms')}</TabsTrigger>
          <TabsTrigger value="tenants">{`${t('common.tenant')} (${lease.parties?.length ?? 0})`}</TabsTrigger>
          <TabsTrigger value="rent">{`${t('nav.rent')} (${periods.length})`}</TabsTrigger>
          <TabsTrigger value="deposit">{t('leases.deposit')}</TabsTrigger>
          <TabsTrigger value="documents">{t('documents.title')}</TabsTrigger>
        </TabsList>

        <TabsContent value="terms">
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem label={t('common.apartment')} value={apartmentLabel} />
                <DetailItem label={t('leases.start')} value={formatDate(lease.startDate)} />
                <DetailItem label={t('leases.end')} value={formatDate(lease.endDate)} />
                <DetailItem
                  label={t('leases.monthlyRent')}
                  value={formatMoney(lease.monthlyRent, currency)}
                />
                <DetailItem label={t('leases.rentDueDay')} value={String(lease.rentDueDay)} />
                <DetailItem
                  label={t('leases.depositAmount')}
                  value={formatMoney(lease.depositAmount, currency)}
                />
                {lease.terminationNote && (
                  <DetailItem label={t('leases.terminationNote')} value={lease.terminationNote} full />
                )}
              </div>
              <div className="mt-6 border-t pt-4">
                <EntityTags entityType="lease" entityId={id} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('leases.primaryTenant')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(lease.parties ?? []).map((p) => (
                  <TableRow key={p.tenant.id}>
                    <TableCell>
                      {p.tenant.firstName} {p.tenant.lastName}
                    </TableCell>
                    <TableCell>
                      {p.isPrimary ? <Star className="h-4 w-4 fill-primary text-primary" /> : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {(lease.parties?.length ?? 0) === 0 && <EmptyRow colSpan={2} text="—" />}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="rent">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.period')}</TableHead>
                  <TableHead>{t('rent.dueDate')}</TableHead>
                  <TableHead className="text-right">{t('rent.expected')}</TableHead>
                  <TableHead className="text-right">{t('rent.paid')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatMonthYear(p.periodYear, p.periodMonth)}</TableCell>
                    <TableCell>{formatDate(p.dueDate)}</TableCell>
                    <TableCell className="text-right">{formatMoney(p.expectedAmount, currency)}</TableCell>
                    <TableCell className="text-right">{formatMoney(p.paidAmount, currency)}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {periods.length === 0 && <EmptyRow colSpan={5} text={t('rent.noPeriods')} />}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="deposit">
          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div className="grid flex-1 gap-4 sm:grid-cols-2">
                  <DetailItem
                    label={t('leases.depositAmount')}
                    value={formatMoney(lease.depositAmount, currency)}
                  />
                  <DetailItem
                    label={t('leases.depositBalance')}
                    value={formatMoney(lease.depositBalance, currency)}
                  />
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">{t('leases.depositStatus')}</p>
                    <StatusBadge status={lease.depositStatus} />
                  </div>
                  {lease.depositSettledAt && (
                    <>
                      <DetailItem
                        label={t('leases.depositReturned')}
                        value={formatMoney(lease.depositReturnedAmount ?? 0, currency)}
                      />
                      <DetailItem
                        label={t('leases.depositSettledAt')}
                        value={formatDate(lease.depositSettledAt)}
                      />
                      {lease.depositSettlementNote && (
                        <DetailItem label={t('common.notes')} value={lease.depositSettlementNote} full />
                      )}
                    </>
                  )}
                </div>
                {!lease.depositSettledAt && (
                  <Can permission="deposits:update">
                    <Button
                      onClick={() => {
                        settleForm.reset({ returnAmount: Number(lease.depositBalance) });
                        setSettleOpen(true);
                      }}
                    >
                      {t('leases.settleDeposit')}
                    </Button>
                  </Can>
                )}
              </div>
              <Separator className="my-4" />
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium">{t('leases.deductions')}</h3>
                <Can permission="deposits:update">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!lease.depositSettledAt}
                    onClick={() => setDeductOpen(true)}
                  >
                    {t('leases.addDeduction')}
                  </Button>
                </Can>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>{t('leases.reason')}</TableHead>
                    <TableHead className="text-right">{t('common.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{formatDate(d.createdAt)}</TableCell>
                      <TableCell>{d.reason}</TableCell>
                      <TableCell className="text-right">{formatMoney(d.amount, currency)}</TableCell>
                    </TableRow>
                  ))}
                  {deductions.length === 0 && <EmptyRow colSpan={3} text={t('common.noRecords')} />}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsSection ownerType="lease" ownerId={id} />
        </TabsContent>
      </Tabs>

      {/* Add deduction dialog */}
      <Dialog open={deductOpen} onOpenChange={setDeductOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('leases.addDeduction')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={deductForm.handleSubmit(onAddDeduction)} className="space-y-4">
            <Field label={t('common.amount')} htmlFor="dd-amount">
              <Input id="dd-amount" type="number" step="0.01" {...deductForm.register('amount')} />
            </Field>
            <Field label={t('leases.reason')} htmlFor="dd-reason">
              <Textarea id="dd-reason" rows={2} {...deductForm.register('reason')} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDeductOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={addingDeduction}>
                {addingDeduction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Settle deposit dialog */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('leases.settleDeposit')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={settleForm.handleSubmit(onSettle)} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('leases.settleHint', { balance: formatMoney(lease.depositBalance, currency) })}
            </p>
            <Field label={t('leases.returnAmount')} htmlFor="st-amount">
              <Input
                id="st-amount"
                type="number"
                min={0}
                max={Number(lease.depositBalance)}
                step="0.01"
                {...settleForm.register('returnAmount')}
              />
            </Field>
            <Field label={t('rent.note')} htmlFor="st-note">
              <Textarea id="st-note" rows={2} {...settleForm.register('note')} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setSettleOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={settling}>
                {settling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('leases.settleDeposit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Terminate dialog */}
      <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('leases.terminate')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={terminateForm.handleSubmit(onTerminate)} className="space-y-4">
            <Field label={t('leases.terminationNote')} htmlFor="tm-note">
              <Textarea id="tm-note" rows={2} {...terminateForm.register('terminationNote')} />
            </Field>
            <Field label={t('leases.penaltyAmount')} htmlFor="tm-penalty">
              <Input id="tm-penalty" type="number" step="0.01" {...terminateForm.register('penaltyAmount')} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setTerminateOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="destructive" disabled={terminating}>
                {terminating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('leases.terminate')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
