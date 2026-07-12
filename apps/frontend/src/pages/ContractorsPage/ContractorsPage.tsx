import React, { useState } from 'react';
import { Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGetContractorsQuery,
  useCreateContractorMutation,
  useDeleteContractorMutation,
  Contractor,
} from '../../entities/contractors/api/contractorsApi';
import { EntityTags } from '../../widgets/EntityTags/EntityTags';
import { DocumentsSection } from '../../widgets/DocumentsSection/DocumentsSection';
import { PhotosSection } from '../../widgets/PhotosSection/PhotosSection';
import { Can } from '../../shared/ui/Can';
import { Field } from '../../shared/ui/Field';
import { PageSpinner } from '../../shared/ui/Spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  telegram: z.string().optional(),
  specialty: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function DetailItem({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  );
}

export function ContractorsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Contractor | null>(null);

  const { data, isLoading, error } = useGetContractorsQuery({ search: search || undefined });
  const [create, { isLoading: creating }] = useCreateContractorMutation();
  const [remove] = useDeleteContractorMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (d: FormData) => {
    const payload = { ...d, email: d.email || undefined };
    await create(payload);
    reset();
    setOpen(false);
  };

  const contractors = (data?.data ?? []) as Contractor[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('contractors.title')}</h1>
        <Can permission="contractors:create">
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('contractors.addContractor')}
          </Button>
        </Can>
      </div>

      <div className="relative mb-6 w-72">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('contractors.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-8"
        />
      </div>

      {isLoading && <PageSpinner />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t('contractors.failedToLoad')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.name')}</TableHead>
              <TableHead>{t('contractors.specialty')}</TableHead>
              <TableHead>{t('common.phone')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead className="text-right">{t('common.action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractors.map((c) => (
              <TableRow key={c.id} className="cursor-pointer">
                <TableCell className="font-medium" onClick={() => setSelected(c)}>
                  {c.name}
                </TableCell>
                <TableCell onClick={() => setSelected(c)}>{c.specialty ?? '—'}</TableCell>
                <TableCell onClick={() => setSelected(c)}>{c.phone ?? '—'}</TableCell>
                <TableCell onClick={() => setSelected(c)}>
                  <Badge
                    variant={c.isActive ? 'default' : 'secondary'}
                    className={
                      c.isActive
                        ? 'border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : ''
                    }
                  >
                    {c.isActive ? t('contractors.statusActive') : t('contractors.statusInactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Can permission="contractors:delete">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        void remove(c.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Can>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && contractors.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {t('contractors.noContractors')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Details dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('contractors.details')}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <DetailItem label={t('common.name')} value={selected.name} />
                <DetailItem label={t('contractors.specialty')} value={selected.specialty} />
                <DetailItem label={t('common.phone')} value={selected.phone} />
                <DetailItem label={t('contractors.email')} value={selected.email} />
                <DetailItem label={t('contractors.telegram')} value={selected.telegram} />
              </div>
              {selected.notes && <DetailItem label={t('common.notes')} value={selected.notes} />}
              <div>
                <p className="text-xs text-muted-foreground">{t('contractors.recentRepairs')}</p>
                {selected.repairs && selected.repairs.length > 0 ? (
                  selected.repairs.map((r) => (
                    <p key={r.id} className="text-sm">
                      • {r.title} — {r.status}
                    </p>
                  ))
                ) : (
                  <p className="text-sm">—</p>
                )}
              </div>
              <EntityTags entityType="contractor" entityId={selected.id} />
              <PhotosSection
                ownerType="contractor"
                ownerId={selected.id}
                permission="contractors:update"
                purpose="contractor-photo"
                titleKey="contractors.photos"
                addKey="contractors.addPhoto"
                emptyKey="contractors.noPhotos"
              />
              <div>
                <p className="mb-1 text-xs text-muted-foreground">{t('documents.title')}</p>
                <DocumentsSection ownerType="contractor" ownerId={selected.id} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              {t('common.back')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('contractors.addDialog')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label={t('common.name')} htmlFor="ct-name" error={errors.name?.message}>
              <Input id="ct-name" {...register('name')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('common.phone')} htmlFor="ct-phone">
                <Input id="ct-phone" {...register('phone')} />
              </Field>
              <Field label={t('contractors.email')} htmlFor="ct-email" error={errors.email?.message}>
                <Input id="ct-email" type="email" {...register('email')} />
              </Field>
              <Field label={t('contractors.telegram')} htmlFor="ct-telegram">
                <Input id="ct-telegram" placeholder="@username" {...register('telegram')} />
              </Field>
              <Field label={t('contractors.specialty')} htmlFor="ct-specialty">
                <Input id="ct-specialty" {...register('specialty')} />
              </Field>
            </div>
            <Field label={t('common.notes')} htmlFor="ct-notes">
              <Textarea id="ct-notes" rows={2} {...register('notes')} />
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
