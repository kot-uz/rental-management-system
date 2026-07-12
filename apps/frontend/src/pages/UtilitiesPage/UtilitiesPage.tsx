import React, { useState } from 'react';
import { Loader2, Paperclip, Plus, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGetUtilitiesQuery,
  useCreateUtilityMutation,
  useMarkUtilityPaidMutation,
  useUpdateUtilityMutation,
  UtilityRecord,
} from '../../entities/utilities/api/utilitiesApi';
import { useGetApartmentsQuery } from '../../entities/apartments/api/apartmentsApi';
import { useUploadFileMutation } from '../../entities/files/api/filesApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Field } from '../../shared/ui/Field';
import { PageSpinner } from '../../shared/ui/Spinner';
import { formatMoney, formatMonthYear } from '../../shared/utils/formatMoney';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  type: z.string().min(1),
  periodYear: z.coerce.number(),
  periodMonth: z.coerce.number().min(1).max(12),
  amount: z.coerce.number().positive(),
  readingFrom: z.coerce.number().optional(),
  readingTo: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const UTILITY_TYPES = ['ELECTRICITY', 'GAS', 'WATER', 'INTERNET', 'GARBAGE', 'HEATING', 'CUSTOM'];
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

export function UtilitiesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState('');
  const now = new Date();

  const { data, isLoading, error } = useGetUtilitiesQuery({});
  const { data: aptsData } = useGetApartmentsQuery({});
  const [create, { isLoading: creating }] = useCreateUtilityMutation();
  const [updateUtility] = useUpdateUtilityMutation();
  const [markPaid] = useMarkUtilityPaidMutation();
  const [uploadFile, { isLoading: uploading }] = useUploadFileMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'ELECTRICITY',
      periodYear: now.getFullYear(),
      periodMonth: now.getMonth() + 1,
    },
  });

  const handleClose = () => {
    setOpen(false);
    setReceiptFiles([]);
    setUploadError('');
    reset();
  };

  const removeFile = (i: number) => {
    setReceiptFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const onSubmit = async (d: FormData) => {
    setUploadError('');
    const createResult = await create(d);
    if (!('data' in createResult) || !createResult.data) return;

    const utilityId = createResult.data.data.id;

    for (let i = 0; i < receiptFiles.length; i++) {
      const fd = new FormData();
      fd.append('file', receiptFiles[i]);
      fd.append('ownerId', utilityId);
      fd.append('ownerType', 'utility');
      fd.append('purpose', 'receipt');

      const uploadResult = await uploadFile(fd);
      if (!('data' in uploadResult) || !uploadResult.data) {
        setUploadError(t('utilities.uploadError'));
      } else if (i === 0) {
        await updateUtility({ id: utilityId, data: { receiptFileId: uploadResult.data.data.id } });
      }
    }

    handleClose();
  };

  const records = (data?.data ?? []) as UtilityRecord[];
  const apartments = aptsData?.data ?? [];
  const isBusy = creating || uploading;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('utilities.title')}</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('utilities.addRecord')}
        </Button>
      </div>

      {isLoading && <PageSpinner />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t('utilities.failedToLoad')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.apartment')}</TableHead>
              <TableHead>{t('common.type')}</TableHead>
              <TableHead>{t('common.period')}</TableHead>
              <TableHead className="text-right">{t('common.amount')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead>{t('common.action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => navigate(`/app/utilities/${r.id}`)}
              >
                <TableCell>{r.apartment?.address ?? '—'}</TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell>{formatMonthYear(r.periodYear, r.periodMonth)}</TableCell>
                <TableCell className="text-right">{formatMoney(r.amount)}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell>
                  {r.status === 'UNPAID' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-600/50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
                      onClick={(e) => {
                        e.stopPropagation();
                        void markPaid(r.id);
                      }}
                    >
                      {t('utilities.markPaid')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && records.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {t('utilities.noRecords')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('utilities.addDialog')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label={t('utilities.apartmentLabel')} error={errors.apartmentId?.message}>
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
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('utilities.typeLabel')}>
                <Select value={watch('type')} onValueChange={(v) => setValue('type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UTILITY_TYPES.map((ut) => (
                      <SelectItem key={ut} value={ut}>
                        {ut}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('common.year')} htmlFor="ut-year">
                  <Input id="ut-year" type="number" {...register('periodYear')} />
                </Field>
                <Field label={t('common.month')} htmlFor="ut-month">
                  <Input id="ut-month" type="number" min={1} max={12} {...register('periodMonth')} />
                </Field>
              </div>
            </div>
            <Field label={t('utilities.amountLabel')} htmlFor="ut-amount" error={errors.amount?.message}>
              <Input id="ut-amount" type="number" step="0.01" {...register('amount')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('utilities.readingFrom')} htmlFor="ut-from">
                <Input id="ut-from" type="number" {...register('readingFrom')} />
              </Field>
              <Field label={t('utilities.readingTo')} htmlFor="ut-to">
                <Input id="ut-to" type="number" {...register('readingTo')} />
              </Field>
            </div>
            <Field label={t('common.notes')} htmlFor="ut-notes">
              <Input id="ut-notes" {...register('notes')} />
            </Field>

            {/* Multi-file upload */}
            <div>
              <input
                id="receipt-file-input"
                type="file"
                accept={ACCEPTED_TYPES}
                multiple
                className="hidden"
                onChange={(e) => {
                  const added = Array.from(e.target.files ?? []);
                  setReceiptFiles((prev) => [...prev, ...added]);
                  setUploadError('');
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => document.getElementById('receipt-file-input')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {t('utilities.attachReceipts')}
              </Button>

              {receiptFiles.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {receiptFiles.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Paperclip className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFile(i)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {uploadError && <p className="mt-1 text-xs text-destructive">{uploadError}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isBusy}>
                {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
