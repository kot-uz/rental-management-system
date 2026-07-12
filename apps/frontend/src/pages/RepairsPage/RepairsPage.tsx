import React, { useState } from 'react';
import { Download, Loader2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGetRepairsQuery, useCreateRepairMutation, Repair } from '../../entities/repairs/api/repairsApi';
import { useGetApartmentsQuery } from '../../entities/apartments/api/apartmentsApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { Field } from '../../shared/ui/Field';
import { PageSpinner } from '../../shared/ui/Spinner';
import { TagFilter } from '../../widgets/EntityTags/TagFilter';
import { useAppSelector } from '../../shared/hooks/useAppSelector';
import { downloadFile } from '../../shared/utils/download';
import { formatDate } from '../../shared/utils/formatMoney';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
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

const schema = z.object({
  apartmentId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  location: z.string().optional(),
  costEstimate: z.coerce.number().optional(),
  contractorName: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function RepairsPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const navigate = useNavigate();
  const token = useAppSelector((s) => s.auth.accessToken);

  const { data, isLoading, error } = useGetRepairsQuery({ tagId: tagFilter || undefined });
  const { data: aptsData } = useGetApartmentsQuery({});
  const [create, { isLoading: creating }] = useCreateRepairMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { severity: 'LOW' },
  });

  const onSubmit = async (d: FormData) => {
    await create(d);
    reset();
    setOpen(false);
  };

  const repairs = (data?.data ?? []) as Repair[];
  const apartments = aptsData?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('repairs.title')}</h1>
        <div className="flex gap-2">
          <Can permission="repairs:export">
            <Button variant="outline" onClick={() => downloadFile('/reports/repairs.csv', token)}>
              <Download className="mr-2 h-4 w-4" />
              {t('common.exportCsv')}
            </Button>
          </Can>
          <Can permission="repairs:create">
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('repairs.reportIssue')}
            </Button>
          </Can>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <TagFilter value={tagFilter} onChange={setTagFilter} />
      </div>

      {isLoading && <PageSpinner />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t('repairs.failedToLoad')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.name')}</TableHead>
              <TableHead>{t('common.apartment')}</TableHead>
              <TableHead>{t('repairs.severity')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead>{t('repairs.created')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repairs.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => navigate(`/app/repairs/${r.id}`)}
              >
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell>
                  {r.apartment
                    ? `${r.apartment.address}${r.apartment.unitNumber ? ` · ${r.apartment.unitNumber}` : ''}`
                    : '—'}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.severity} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell>{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
            {!isLoading && repairs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {t('repairs.noRepairs')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('repairs.reportDialog')}</DialogTitle>
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
                  {apartments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.address}
                      {a.unitNumber ? ` · ${a.unitNumber}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('repairs.titleField')} htmlFor="rp-title" error={errors.title?.message}>
              <Input id="rp-title" {...register('title')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('repairs.severity')}>
                <Select
                  value={watch('severity')}
                  onValueChange={(v) => setValue('severity', v as FormData['severity'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">{t('repairs.severityLow')}</SelectItem>
                    <SelectItem value="MEDIUM">{t('repairs.severityMedium')}</SelectItem>
                    <SelectItem value="HIGH">{t('repairs.severityHigh')}</SelectItem>
                    <SelectItem value="CRITICAL">{t('repairs.severityCritical')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('repairs.location')} htmlFor="rp-location">
                <Input id="rp-location" placeholder={t('repairs.locationPlaceholder')} {...register('location')} />
              </Field>
            </div>
            <Field label={t('common.description')} htmlFor="rp-desc">
              <Textarea id="rp-desc" rows={2} {...register('description')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('repairs.costEstimate')} htmlFor="rp-cost">
                <Input id="rp-cost" type="number" {...register('costEstimate')} />
              </Field>
              <Field label={t('repairs.contractorName')} htmlFor="rp-contractor">
                <Input id="rp-contractor" {...register('contractorName')} />
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
