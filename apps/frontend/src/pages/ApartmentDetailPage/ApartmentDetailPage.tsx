import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import {
  useGetApartmentQuery,
  useUpdateApartmentMutation,
  useDeleteApartmentMutation,
} from '../../entities/apartments/api/apartmentsApi';
import { useGetLeasesQuery } from '../../entities/leases/api/leasesApi';
import { useGetRepairsQuery } from '../../entities/repairs/api/repairsApi';
import { useGetUtilitiesQuery } from '../../entities/utilities/api/utilitiesApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { Field } from '../../shared/ui/Field';
import { PageSpinner } from '../../shared/ui/Spinner';
import { BackButton, ConfirmDialog, DetailItem, EmptyRow } from '../../shared/ui/DetailBits';
import { DocumentsSection } from '../../widgets/DocumentsSection/DocumentsSection';
import { PhotosSection } from '../../widgets/PhotosSection/PhotosSection';
import { EntityTags } from '../../widgets/EntityTags/EntityTags';
import { formatMoney, formatDate, formatMonthYear } from '../../shared/utils/formatMoney';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type EditForm = {
  address: string;
  unitNumber?: string;
  floor?: number;
  rooms?: number;
  areaSqm?: number;
  status: string;
  notes?: string;
};

export function ApartmentDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, error } = useGetApartmentQuery(id);
  const { data: leasesData } = useGetLeasesQuery({ apartmentId: id });
  const { data: repairsData } = useGetRepairsQuery({ apartmentId: id });
  const { data: utilitiesData } = useGetUtilitiesQuery({ apartmentId: id });
  const [updateApartment, { isLoading: saving }] = useUpdateApartmentMutation();
  const [deleteApartment] = useDeleteApartmentMutation();

  const { register, handleSubmit, reset, setValue, watch } = useForm<EditForm>();

  const apt = data?.data;
  const leases = leasesData?.data ?? [];
  const repairs = repairsData?.data ?? [];
  const utilities = utilitiesData?.data ?? [];

  const openEdit = () => {
    if (apt) {
      reset({
        address: apt.address,
        unitNumber: apt.unitNumber,
        floor: apt.floor,
        rooms: apt.rooms,
        areaSqm: apt.areaSqm,
        status: apt.status,
        notes: apt.notes,
      });
      setEditOpen(true);
    }
  };

  const onSave = async (form: EditForm) => {
    await updateApartment({
      id,
      data: {
        ...form,
        floor: form.floor ? Number(form.floor) : undefined,
        rooms: form.rooms ? Number(form.rooms) : undefined,
        areaSqm: form.areaSqm ? Number(form.areaSqm) : undefined,
      } as never,
    });
    setEditOpen(false);
  };

  const onDelete = async () => {
    await deleteApartment(id);
    setConfirmOpen(false);
    navigate('/app/apartments');
  };

  if (isLoading) return <PageSpinner />;
  if (error || !apt) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t('apartments.failedToLoad')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <BackButton onClick={() => navigate('/app/apartments')} />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {apt.address}
            {apt.unitNumber ? ` · ${apt.unitNumber}` : ''}
          </h1>
          <div className="mt-2">
            <StatusBadge status={apt.status} />
          </div>
        </div>
        <div className="flex gap-2">
          <Can permission="apartments:update">
            <Button variant="outline" onClick={openEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
          </Can>
          <Can permission="apartments:delete">
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('common.delete')}
            </Button>
          </Can>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="overview">{t('common.overview')}</TabsTrigger>
          <TabsTrigger value="leases">{`${t('nav.leases')} (${leases.length})`}</TabsTrigger>
          <TabsTrigger value="repairs">{`${t('nav.repairs')} (${repairs.length})`}</TabsTrigger>
          <TabsTrigger value="utilities">{`${t('nav.utilities')} (${utilities.length})`}</TabsTrigger>
          <TabsTrigger value="photos">{t('apartments.photos')}</TabsTrigger>
          <TabsTrigger value="documents">{t('documents.title')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem
                  label={t('common.address')}
                  value={`${apt.address}${apt.unitNumber ? ` · ${apt.unitNumber}` : ''}`}
                />
                {apt.floor != null && <DetailItem label={t('apartments.floor')} value={String(apt.floor)} />}
                {apt.rooms != null && <DetailItem label={t('apartments.rooms')} value={String(apt.rooms)} />}
                {apt.areaSqm != null && (
                  <DetailItem label={t('apartments.areaSqm')} value={`${apt.areaSqm} m²`} />
                )}
                {apt.notes && <DetailItem label={t('common.notes')} value={apt.notes} full />}
              </div>
              <div className="mt-6 border-t pt-4">
                <EntityTags entityType="apartment" entityId={id} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leases">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
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
                {leases.length === 0 && <EmptyRow colSpan={5} text={t('leases.noLeases')} />}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="repairs">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.description')}</TableHead>
                  <TableHead>{t('repairs.severity')}</TableHead>
                  <TableHead className="text-right">{t('repairs.costActual')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repairs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.title}</TableCell>
                    <TableCell>{r.severity}</TableCell>
                    <TableCell className="text-right">
                      {r.costActual != null ? formatMoney(r.costActual) : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>{formatDate(r.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {repairs.length === 0 && <EmptyRow colSpan={5} text={t('repairs.noRepairs')} />}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="utilities">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.type')}</TableHead>
                  <TableHead>{t('common.period')}</TableHead>
                  <TableHead className="text-right">{t('common.amount')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {utilities.map((u) => (
                  <TableRow
                    key={u.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/app/utilities/${u.id}`)}
                  >
                    <TableCell>{u.type}</TableCell>
                    <TableCell>{formatMonthYear(u.periodYear, u.periodMonth)}</TableCell>
                    <TableCell className="text-right">{formatMoney(u.amount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {utilities.length === 0 && <EmptyRow colSpan={4} text={t('utilities.noUtilities')} />}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="photos">
          <Card>
            <CardContent className="p-6">
              <PhotosSection
                ownerType="apartment"
                ownerId={id}
                permission="apartments:update"
                purpose="apartment-photo"
                titleKey="apartments.photos"
                addKey="apartments.addPhoto"
                emptyKey="apartments.noPhotos"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsSection ownerType="apartment" ownerId={id} />
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('common.edit')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <Field label={t('common.address')} htmlFor="ed-address">
              <Input id="ed-address" {...register('address')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('apartments.unitNumber')} htmlFor="ed-unit">
                <Input id="ed-unit" {...register('unitNumber')} />
              </Field>
              <Field label={t('common.status')}>
                <Select value={watch('status')} onValueChange={(v) => setValue('status', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VACANT">{t('apartments.statusVacant')}</SelectItem>
                    <SelectItem value="OCCUPIED">{t('apartments.statusOccupied')}</SelectItem>
                    <SelectItem value="ARCHIVED">{t('apartments.statusArchived')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label={t('apartments.floor')} htmlFor="ed-floor">
                <Input id="ed-floor" type="number" {...register('floor')} />
              </Field>
              <Field label={t('apartments.rooms')} htmlFor="ed-rooms">
                <Input id="ed-rooms" type="number" {...register('rooms')} />
              </Field>
              <Field label={t('apartments.areaSqm')} htmlFor="ed-area">
                <Input id="ed-area" type="number" {...register('areaSqm')} />
              </Field>
            </div>
            <Field label={t('common.notes')} htmlFor="ed-notes">
              <Textarea id="ed-notes" rows={2} {...register('notes')} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('common.delete')}
        description={t('common.deleteConfirm')}
        confirmLabel={t('common.delete')}
        onConfirm={onDelete}
      />
    </div>
  );
}
