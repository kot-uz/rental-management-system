import React, { useState } from 'react';
import { Download, Loader2, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGetApartmentsQuery,
  useCreateApartmentMutation,
  Apartment,
} from '../../entities/apartments/api/apartmentsApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { Field } from '../../shared/ui/Field';
import { PageSpinner } from '../../shared/ui/Spinner';
import { TagFilter } from '../../widgets/EntityTags/TagFilter';
import { useAppSelector } from '../../shared/hooks/useAppSelector';
import { downloadFile } from '../../shared/utils/download';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

const makeSchema = (t: (k: string) => string) =>
  z.object({
    address: z.string().min(1, t('validation.addressRequired')),
    unitNumber: z.string().optional(),
    floor: z.coerce.number().optional(),
    rooms: z.coerce.number().int().min(1).optional(),
    areaSqm: z.coerce.number().positive().optional(),
    notes: z.string().optional(),
  });

type FormData = z.infer<ReturnType<typeof makeSchema>>;

const ALL = '__all__';

export function ApartmentsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const token = useAppSelector((s) => s.auth.accessToken);

  const { data, isLoading, error } = useGetApartmentsQuery({
    search: search || undefined,
    status: statusFilter || undefined,
    tagId: tagFilter || undefined,
  });
  const [createApartment, { isLoading: creating }] = useCreateApartmentMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(makeSchema(t)),
  });

  const onSubmit = async (formData: FormData) => {
    await createApartment(formData);
    reset();
    setOpen(false);
  };

  const apartments = (data?.data ?? []) as Apartment[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('apartments.title')}</h1>
        <div className="flex gap-2">
          <Can permission="apartments:export">
            <Button variant="outline" onClick={() => downloadFile('/reports/apartments.csv', token)}>
              <Download className="mr-2 h-4 w-4" />
              {t('common.exportCsv')}
            </Button>
          </Can>
          <Can permission="apartments:create">
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('apartments.addApartment')}
            </Button>
          </Can>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <div className="relative min-w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('apartments.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <Select
          value={statusFilter || ALL}
          onValueChange={(v) => setStatusFilter(v === ALL ? '' : v)}
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder={t('common.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('common.all')}</SelectItem>
            <SelectItem value="VACANT">{t('apartments.statusVacant')}</SelectItem>
            <SelectItem value="OCCUPIED">{t('apartments.statusOccupied')}</SelectItem>
            <SelectItem value="ARCHIVED">{t('apartments.statusArchived')}</SelectItem>
          </SelectContent>
        </Select>
        <TagFilter value={tagFilter} onChange={setTagFilter} />
      </div>

      {isLoading && <PageSpinner />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t('apartments.failedToLoad')}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apartments.map((apt) => (
          <Card
            key={apt.id}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => navigate(`/app/apartments/${apt.id}`)}
          >
            <CardContent className="p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="break-words font-semibold leading-snug">
                  {apt.address}
                  {apt.unitNumber && ` · ${apt.unitNumber}`}
                </h3>
                <StatusBadge status={apt.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {apt.rooms && (
                  <Badge variant="secondary">{t('apartments.roomsChip', { count: apt.rooms })}</Badge>
                )}
                {apt.areaSqm && <Badge variant="secondary">{apt.areaSqm} m²</Badge>}
                {apt.floor && (
                  <Badge variant="secondary">{t('apartments.floorChip', { floor: apt.floor })}</Badge>
                )}
              </div>
              {apt.leases?.[0] && (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">
                    {t('apartments.tenantLabel')} {apt.leases[0].parties?.[0]?.tenant?.firstName ?? '—'}{' '}
                    {apt.leases[0].parties?.[0]?.tenant?.lastName ?? ''}
                  </p>
                  <p className="text-sm font-medium text-primary">
                    ${Number(apt.leases[0].monthlyRent).toLocaleString()}/mo
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {!isLoading && apartments.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">{t('apartments.noApartments')}</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('apartments.addDialog')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label={t('common.address')} htmlFor="apt-address" error={errors.address?.message}>
              <Input id="apt-address" {...register('address')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('apartments.unitNumber')} htmlFor="apt-unit">
                <Input id="apt-unit" {...register('unitNumber')} />
              </Field>
              <Field label={t('apartments.floor')} htmlFor="apt-floor">
                <Input id="apt-floor" type="number" {...register('floor')} />
              </Field>
              <Field label={t('apartments.rooms')} htmlFor="apt-rooms">
                <Input id="apt-rooms" type="number" {...register('rooms')} />
              </Field>
              <Field label={t('apartments.areaSqm')} htmlFor="apt-area">
                <Input id="apt-area" type="number" {...register('areaSqm')} />
              </Field>
            </div>
            <Field label={t('common.notes')} htmlFor="apt-notes">
              <Textarea id="apt-notes" rows={2} {...register('notes')} />
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
