import React, { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGetLeasesQuery, useCreateLeaseMutation, Lease } from '../../entities/leases/api/leasesApi';
import { useGetApartmentsQuery } from '../../entities/apartments/api/apartmentsApi';
import { useGetTenantsQuery } from '../../entities/tenants/api/tenantsApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { Field } from '../../shared/ui/Field';
import { PageSpinner } from '../../shared/ui/Spinner';
import { formatMoney, formatDate } from '../../shared/utils/formatMoney';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
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

const schema = z.object({
  apartmentId: z.string().min(1),
  primaryTenantId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  monthlyRent: z.coerce.number().positive(),
  depositAmount: z.coerce.number().min(0),
  rentDueDay: z.coerce.number().int().min(1).max(28).default(1),
});

type FormData = z.infer<typeof schema>;

export function LeasesPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetLeasesQuery({});
  const { data: aptsData } = useGetApartmentsQuery({});
  const { data: tenantsData } = useGetTenantsQuery({});
  const [create, { isLoading: creating }] = useCreateLeaseMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { rentDueDay: 1 },
  });

  const onSubmit = async (d: FormData) => {
    await create(d);
    reset();
    setOpen(false);
  };

  const leases = (data?.data ?? []) as Lease[];
  const apartments = aptsData?.data ?? [];
  const tenants = tenantsData?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('leases.title')}</h1>
        <Can permission="leases:create">
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('leases.newLease')}
          </Button>
        </Can>
      </div>

      {isLoading && <PageSpinner />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t('leases.failedToLoad')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.apartment')}</TableHead>
              <TableHead>{t('common.tenant')}</TableHead>
              <TableHead>{t('leases.start')}</TableHead>
              <TableHead>{t('leases.end')}</TableHead>
              <TableHead className="text-right">{t('leases.monthlyRent')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leases.map((l) => (
              <TableRow
                key={l.id}
                className="cursor-pointer"
                onClick={() => navigate(`/app/leases/${l.id}`)}
              >
                <TableCell>
                  {l.apartment
                    ? `${l.apartment.address}${l.apartment.unitNumber ? ` · ${l.apartment.unitNumber}` : ''}`
                    : '—'}
                </TableCell>
                <TableCell>
                  {l.parties?.find((p) => p.isPrimary)?.tenant
                    ? `${l.parties.find((p) => p.isPrimary)!.tenant.firstName} ${l.parties.find((p) => p.isPrimary)!.tenant.lastName}`
                    : '—'}
                </TableCell>
                <TableCell>{formatDate(l.startDate)}</TableCell>
                <TableCell>{formatDate(l.endDate)}</TableCell>
                <TableCell className="text-right">{formatMoney(l.monthlyRent, l.currency)}</TableCell>
                <TableCell>
                  <StatusBadge status={l.status} />
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && leases.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {t('leases.noLeases')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('leases.createDialog')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label={t('leases.apartmentLabel')} error={errors.apartmentId?.message}>
              <Select
                value={watch('apartmentId') ?? ''}
                onValueChange={(v) => setValue('apartmentId', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {apartments
                    .filter((a) => a.status === 'VACANT')
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.address}
                        {a.unitNumber ? ` · ${a.unitNumber}` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('leases.primaryTenant')} error={errors.primaryTenantId?.message}>
              <Select
                value={watch('primaryTenantId') ?? ''}
                onValueChange={(v) => setValue('primaryTenantId', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.firstName} {tenant.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('leases.startDate')} htmlFor="ls-start" error={errors.startDate?.message}>
                <Input id="ls-start" type="date" {...register('startDate')} />
              </Field>
              <Field label={t('leases.endDate')} htmlFor="ls-end" error={errors.endDate?.message}>
                <Input id="ls-end" type="date" {...register('endDate')} />
              </Field>
              <Field label={t('leases.monthlyRent')} htmlFor="ls-rent" error={errors.monthlyRent?.message}>
                <Input id="ls-rent" type="number" {...register('monthlyRent')} />
              </Field>
              <Field label={t('leases.depositAmount')} htmlFor="ls-deposit" error={errors.depositAmount?.message}>
                <Input id="ls-deposit" type="number" {...register('depositAmount')} />
              </Field>
              <Field label={t('leases.rentDueDay')} htmlFor="ls-dueday" error={errors.rentDueDay?.message}>
                <Input id="ls-dueday" type="number" min={1} max={28} {...register('rentDueDay')} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
