import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import {
  useGetTenantQuery,
  useUpdateTenantMutation,
  useDeleteTenantMutation,
} from '../../entities/tenants/api/tenantsApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { Field } from '../../shared/ui/Field';
import { PageSpinner } from '../../shared/ui/Spinner';
import { BackButton, ConfirmDialog, DetailItem, EmptyRow } from '../../shared/ui/DetailBits';
import { EntityTags } from '../../widgets/EntityTags/EntityTags';
import { DocumentsSection } from '../../widgets/DocumentsSection/DocumentsSection';
import { PhotosSection } from '../../widgets/PhotosSection/PhotosSection';
import { TelegramLinkButton } from '../../widgets/TelegramLink/TelegramLinkButton';
import { useLinkTenantTelegramMutation } from '../../entities/telegram/api/telegramApi';
import { formatMoney, formatDate } from '../../shared/utils/formatMoney';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  firstName: string;
  lastName: string;
  phone: string;
  idType: 'PASSPORT' | 'NATIONAL_ID' | 'OTHER';
  idNumber: string;
  telegram?: string;
  emergencyContact?: string;
  notes?: string;
};

export function TenantDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, error } = useGetTenantQuery(id);
  const [updateTenant, { isLoading: saving }] = useUpdateTenantMutation();
  const [deleteTenant] = useDeleteTenantMutation();
  const [linkTenant] = useLinkTenantTelegramMutation();

  const { register, handleSubmit, reset, setValue, watch } = useForm<EditForm>();

  const tenant = data?.data;
  const parties = tenant?.leaseParties ?? [];

  const idTypeLabel = (idType: string) =>
    idType === 'PASSPORT'
      ? t('tenants.idPassport')
      : idType === 'NATIONAL_ID'
        ? t('tenants.idNational')
        : t('tenants.idOther');

  const openEdit = () => {
    if (tenant) {
      reset({
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        phone: tenant.phone,
        idType: tenant.idType,
        idNumber: tenant.idNumber,
        telegram: tenant.telegram,
        emergencyContact: tenant.emergencyContact,
        notes: tenant.notes,
      });
      setEditOpen(true);
    }
  };

  const onSave = async (form: EditForm) => {
    await updateTenant({ id, data: form });
    setEditOpen(false);
  };

  const onDelete = async () => {
    await deleteTenant(id);
    setConfirmOpen(false);
    navigate('/app/tenants');
  };

  if (isLoading) return <PageSpinner />;
  if (error || !tenant) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t('tenants.failedToLoad')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <BackButton onClick={() => navigate('/app/tenants')} />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {tenant.firstName} {tenant.lastName}
          </h1>
          <div className="mt-2">
            <Badge
              variant={tenant.isActive ? 'default' : 'secondary'}
              className={
                tenant.isActive
                  ? 'border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300'
                  : ''
              }
            >
              {tenant.isActive ? t('tenants.statusActive') : t('tenants.statusInactive')}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Can permission="tenants:update">
            <Button variant="outline" onClick={openEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
          </Can>
          <Can permission="tenants:delete">
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
          <TabsTrigger value="leases">{`${t('nav.leases')} (${parties.length})`}</TabsTrigger>
          <TabsTrigger value="photos">{t('tenants.photos')}</TabsTrigger>
          <TabsTrigger value="documents">{t('documents.title')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem label={t('common.phone')} value={tenant.phone} />
                <DetailItem label={t('tenants.idType')} value={idTypeLabel(tenant.idType)} />
                <DetailItem label={t('tenants.idNumber')} value={tenant.idNumber} />
                {tenant.telegram && <DetailItem label={t('tenants.telegram')} value={tenant.telegram} />}
                {tenant.emergencyContact && (
                  <DetailItem label={t('tenants.emergencyContact')} value={tenant.emergencyContact} />
                )}
                <DetailItem label={t('tenants.added')} value={formatDate(tenant.createdAt)} />
                {tenant.notes && <DetailItem label={t('common.notes')} value={tenant.notes} full />}
              </div>
              <div className="mt-6 border-t pt-4">
                <p className="mb-2 text-xs text-muted-foreground">{t('tenants.telegramNotify')}</p>
                <TelegramLinkButton
                  linked={!!tenant.telegramChatId}
                  requestLink={async () => (await linkTenant(id).unwrap()).data}
                />
              </div>
              <div className="mt-6 border-t pt-4">
                <EntityTags entityType="tenant" entityId={id} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leases">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.apartment')}</TableHead>
                  <TableHead>{t('leases.start')}</TableHead>
                  <TableHead>{t('leases.end')}</TableHead>
                  <TableHead className="text-right">{t('leases.monthlyRent')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parties.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/app/leases/${p.lease.id}`)}
                  >
                    <TableCell>
                      {p.lease.apartment
                        ? `${p.lease.apartment.address}${p.lease.apartment.unitNumber ? ` · ${p.lease.apartment.unitNumber}` : ''}`
                        : '—'}
                    </TableCell>
                    <TableCell>{formatDate(p.lease.startDate)}</TableCell>
                    <TableCell>{formatDate(p.lease.endDate)}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(p.lease.monthlyRent, p.lease.currency)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.lease.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {parties.length === 0 && <EmptyRow colSpan={5} text={t('leases.noLeases')} />}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="photos">
          <Card>
            <CardContent className="p-6">
              <PhotosSection
                ownerType="tenant"
                ownerId={id}
                permission="tenants:update"
                purpose="tenant-photo"
                titleKey="tenants.photos"
                addKey="tenants.addPhoto"
                emptyKey="tenants.noPhotos"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsSection ownerType="tenant" ownerId={id} />
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('common.edit')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('auth.firstName')} htmlFor="te-first">
                <Input id="te-first" {...register('firstName')} />
              </Field>
              <Field label={t('auth.lastName')} htmlFor="te-last">
                <Input id="te-last" {...register('lastName')} />
              </Field>
            </div>
            <Field label={t('common.phone')} htmlFor="te-phone">
              <Input id="te-phone" {...register('phone')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('tenants.idType')}>
                <Select
                  value={watch('idType')}
                  onValueChange={(v) => setValue('idType', v as EditForm['idType'])}
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
              <Field label={t('tenants.idNumber')} htmlFor="te-idnum">
                <Input id="te-idnum" {...register('idNumber')} />
              </Field>
            </div>
            <Field label={t('tenants.telegram')} htmlFor="te-telegram">
              <Input id="te-telegram" placeholder="@username" {...register('telegram')} />
            </Field>
            <Field label={t('tenants.emergencyContact')} htmlFor="te-emergency">
              <Input id="te-emergency" {...register('emergencyContact')} />
            </Field>
            <Field label={t('common.notes')} htmlFor="te-notes">
              <Textarea id="te-notes" rows={2} {...register('notes')} />
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
