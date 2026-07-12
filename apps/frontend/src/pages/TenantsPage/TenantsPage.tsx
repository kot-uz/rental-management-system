import React, { useState } from 'react';
import { Loader2, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGetTenantsQuery, useCreateTenantMutation, Tenant } from '../../entities/tenants/api/tenantsApi';
import { formatDate } from '../../shared/utils/formatMoney';
import { Can } from '../../shared/ui/Can';
import { Field } from '../../shared/ui/Field';
import { PageSpinner } from '../../shared/ui/Spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  idType: z.enum(['PASSPORT', 'NATIONAL_ID', 'OTHER']).default('PASSPORT'),
  idNumber: z.string().min(1),
  telegram: z.string().optional(),
  emergencyContact: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function TenantsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetTenantsQuery({ search: search || undefined });
  const [create, { isLoading: creating }] = useCreateTenantMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { idType: 'PASSPORT' },
  });

  const onSubmit = async (d: FormData) => {
    await create(d);
    reset();
    setOpen(false);
  };

  const tenants = (data?.data ?? []) as Tenant[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('tenants.title')}</h1>
        <Can permission="tenants:create">
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('tenants.addTenant')}
          </Button>
        </Can>
      </div>

      <div className="relative mb-6 w-72">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('tenants.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-8"
        />
      </div>

      {isLoading && <PageSpinner />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t('tenants.failedToLoad')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.name')}</TableHead>
              <TableHead>{t('common.phone')}</TableHead>
              <TableHead>{t('tenants.idType')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead>{t('tenants.added')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow
                key={tenant.id}
                className="cursor-pointer"
                onClick={() => navigate(`/app/tenants/${tenant.id}`)}
              >
                <TableCell className="font-medium">
                  {tenant.firstName} {tenant.lastName}
                </TableCell>
                <TableCell>{tenant.phone}</TableCell>
                <TableCell>{tenant.idType}</TableCell>
                <TableCell>
                  {tenant.isActive ? t('tenants.statusActive') : t('tenants.statusInactive')}
                </TableCell>
                <TableCell>{formatDate(tenant.createdAt)}</TableCell>
              </TableRow>
            ))}
            {!isLoading && tenants.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {t('tenants.noTenants')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('tenants.addDialog')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('auth.firstName')} htmlFor="tn-first" error={errors.firstName?.message}>
                <Input id="tn-first" {...register('firstName')} />
              </Field>
              <Field label={t('auth.lastName')} htmlFor="tn-last" error={errors.lastName?.message}>
                <Input id="tn-last" {...register('lastName')} />
              </Field>
            </div>
            <Field label={t('common.phone')} htmlFor="tn-phone" error={errors.phone?.message}>
              <Input id="tn-phone" {...register('phone')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('tenants.idType')} error={errors.idType?.message}>
                <Select
                  value={watch('idType')}
                  onValueChange={(v) => setValue('idType', v as FormData['idType'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PASSPORT">{t('tenants.idPassport')}</SelectItem>
                    <SelectItem value="NATIONAL_ID">{t('tenants.idNational')}</SelectItem>
                    <SelectItem value="OTHER">{t('tenants.idOther')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('tenants.idNumber')} htmlFor="tn-idnum" error={errors.idNumber?.message}>
                <Input id="tn-idnum" {...register('idNumber')} />
              </Field>
            </div>
            <Field label={t('tenants.telegram')} htmlFor="tn-telegram">
              <Input id="tn-telegram" placeholder="@username" {...register('telegram')} />
            </Field>
            <Field label={t('tenants.emergencyContact')} htmlFor="tn-emergency">
              <Input id="tn-emergency" {...register('emergencyContact')} />
            </Field>
            <Field label={t('common.notes')} htmlFor="tn-notes">
              <Textarea id="tn-notes" rows={2} {...register('notes')} />
            </Field>
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
