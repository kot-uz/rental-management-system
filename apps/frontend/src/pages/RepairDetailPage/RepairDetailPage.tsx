import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import {
  useGetRepairQuery,
  useUpdateRepairMutation,
  useTransitionRepairMutation,
  useAddRepairCommentMutation,
  useDeleteRepairMutation,
} from '../../entities/repairs/api/repairsApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { Field } from '../../shared/ui/Field';
import { PageSpinner } from '../../shared/ui/Spinner';
import { BackButton, ConfirmDialog, DetailItem } from '../../shared/ui/DetailBits';
import { EntityTags } from '../../widgets/EntityTags/EntityTags';
import { PhotosSection } from '../../widgets/PhotosSection/PhotosSection';
import { formatMoney, formatDate } from '../../shared/utils/formatMoney';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELED'] as const;

type EditForm = {
  title: string;
  description?: string;
  severity: string;
  location?: string;
  costEstimate?: number;
  costActual?: number;
  contractorName?: string;
};

export function RepairDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [comment, setComment] = useState('');

  const { data, isLoading, error } = useGetRepairQuery(id);
  const [updateRepair, { isLoading: saving }] = useUpdateRepairMutation();
  const [transitionRepair] = useTransitionRepairMutation();
  const [addComment, { isLoading: commenting }] = useAddRepairCommentMutation();
  const [deleteRepair] = useDeleteRepairMutation();

  const { register, handleSubmit, reset, setValue, watch } = useForm<EditForm>();

  const repair = data?.data;
  const comments = repair?.comments ?? [];

  const statusLabel = (s: string) =>
    t(`repairs.status${s.split('_').map((w) => w[0] + w.slice(1).toLowerCase()).join('')}`);

  const openEdit = () => {
    if (repair) {
      reset({
        title: repair.title,
        description: repair.description,
        severity: repair.severity,
        location: repair.location,
        costEstimate: repair.costEstimate,
        costActual: repair.costActual,
        contractorName: repair.contractorName,
      });
      setEditOpen(true);
    }
  };

  const onSave = async (form: EditForm) => {
    await updateRepair({
      id,
      data: {
        ...form,
        costEstimate: form.costEstimate ? Number(form.costEstimate) : undefined,
        costActual: form.costActual ? Number(form.costActual) : undefined,
      },
    });
    setEditOpen(false);
  };

  const onAddComment = async () => {
    if (!comment.trim()) return;
    await addComment({ id, body: comment.trim() });
    setComment('');
  };

  const onDelete = async () => {
    await deleteRepair(id);
    setConfirmOpen(false);
    navigate('/app/repairs');
  };

  if (isLoading) return <PageSpinner />;
  if (error || !repair) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t('repairs.failedToLoad')}</AlertDescription>
      </Alert>
    );
  }

  const apartmentLabel = repair.apartment
    ? `${repair.apartment.address}${repair.apartment.unitNumber ? ` · ${repair.apartment.unitNumber}` : ''}`
    : '—';

  return (
    <div>
      <BackButton onClick={() => navigate('/app/repairs')} />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{repair.title}</h1>
          <div className="mt-2 flex gap-2">
            <StatusBadge status={repair.severity} />
            <StatusBadge status={repair.status} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Can permission="repairs:update.operational">
            <Select value={repair.status} onValueChange={(v) => transitionRepair({ id, status: v })}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t('repairs.changeStatus')} />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Can>
          <Can permission="repairs:update.operational">
            <Button variant="outline" onClick={openEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
          </Can>
          <Can permission="repairs:delete">
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

      <Tabs defaultValue="details">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="details">{t('repairs.details')}</TabsTrigger>
          <TabsTrigger value="photos">{t('repairs.photos')}</TabsTrigger>
          <TabsTrigger value="comments">{`${t('repairs.comments')} (${comments.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem label={t('common.apartment')} value={apartmentLabel} />
                <DetailItem label={t('repairs.severity')} value={repair.severity} />
                <DetailItem label={t('common.status')} value={statusLabel(repair.status)} />
                {repair.location && <DetailItem label={t('repairs.location')} value={repair.location} />}
                {repair.costEstimate != null && (
                  <DetailItem label={t('repairs.costEstimate')} value={formatMoney(repair.costEstimate)} />
                )}
                {repair.costActual != null && (
                  <DetailItem label={t('repairs.costActual')} value={formatMoney(repair.costActual)} />
                )}
                {repair.contractorName && (
                  <DetailItem label={t('repairs.contractorName')} value={repair.contractorName} />
                )}
                <DetailItem label={t('repairs.created')} value={formatDate(repair.createdAt)} />
                {repair.description && (
                  <DetailItem label={t('common.description')} value={repair.description} full />
                )}
              </div>
              <div className="mt-6 border-t pt-4">
                <EntityTags entityType="repair" entityId={id} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos">
          <Card>
            <CardContent className="p-6">
              <PhotosSection ownerType="repair" ownerId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments">
          <Card>
            <CardContent className="p-6">
              <Can permission="repairs:comment">
                <div className="mb-4 flex gap-2">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('repairs.addComment')}
                    rows={1}
                    className="min-h-9"
                  />
                  <Button onClick={onAddComment} disabled={commenting || !comment.trim()}>
                    {commenting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('common.save')}
                  </Button>
                </div>
                <Separator />
              </Can>
              <ul className="divide-y">
                {comments.map((c) => (
                  <li key={c.id} className="py-3">
                    <p className="text-sm">{c.body}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(c.createdAt)}</p>
                  </li>
                ))}
              </ul>
              {comments.length === 0 && (
                <p className="py-3 text-sm text-muted-foreground">{t('repairs.noComments')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('common.edit')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <Field label={t('repairs.titleField')} htmlFor="re-title">
              <Input id="re-title" {...register('title')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('repairs.severity')}>
                <Select value={watch('severity')} onValueChange={(v) => setValue('severity', v)}>
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
              <Field label={t('repairs.location')} htmlFor="re-location">
                <Input id="re-location" {...register('location')} />
              </Field>
              <Field label={t('repairs.costEstimate')} htmlFor="re-est">
                <Input id="re-est" type="number" {...register('costEstimate')} />
              </Field>
              <Field label={t('repairs.costActual')} htmlFor="re-act">
                <Input id="re-act" type="number" {...register('costActual')} />
              </Field>
            </div>
            <Field label={t('repairs.contractorName')} htmlFor="re-contractor">
              <Input id="re-contractor" {...register('contractorName')} />
            </Field>
            <Field label={t('common.description')} htmlFor="re-desc">
              <Textarea id="re-desc" rows={2} {...register('description')} />
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
