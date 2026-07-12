import React, { useState } from 'react';
import { History, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGetWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  useTestWebhookMutation,
  useGetWebhookDeliveriesQuery,
  WebhookEndpoint,
  WEBHOOK_EVENTS,
} from '../../entities/webhooks/api/webhooksApi';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { Can } from '../../shared/ui/Can';
import { Field } from '../../shared/ui/Field';
import { PageSpinner } from '../../shared/ui/Spinner';
import { formatDate } from '../../shared/utils/formatMoney';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
  url: z.string().url(),
  secret: z.string().min(8),
  events: z.array(z.string()).min(1),
});
type FormData = z.infer<typeof schema>;

function DeliveriesDialog({ endpoint, onClose }: { endpoint: WebhookEndpoint; onClose: () => void }) {
  const { t } = useTranslation();
  const { data, isLoading } = useGetWebhookDeliveriesQuery(endpoint.id);
  const deliveries = data?.data ?? [];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('webhooks.deliveriesTitle')}</DialogTitle>
        </DialogHeader>
        <p className="break-all text-sm text-muted-foreground">{endpoint.url}</p>
        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.date')}</TableHead>
              <TableHead>{t('webhooks.event')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead className="text-right">{t('webhooks.attempts')}</TableHead>
              <TableHead className="text-right">HTTP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{formatDate(d.createdAt)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {d.eventType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge status={d.status} />
                </TableCell>
                <TableCell className="text-right">{d.attempts}</TableCell>
                <TableCell className="text-right">{d.responseStatus ?? '—'}</TableCell>
              </TableRow>
            ))}
            {!isLoading && deliveries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {t('webhooks.noDeliveries')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WebhooksPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [deliveriesFor, setDeliveriesFor] = useState<WebhookEndpoint | null>(null);

  const { data, isLoading, error } = useGetWebhooksQuery();
  const [create, { isLoading: creating }] = useCreateWebhookMutation();
  const [update] = useUpdateWebhookMutation();
  const [remove] = useDeleteWebhookMutation();
  const [test] = useTestWebhookMutation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { url: '', secret: '', events: [] },
  });
  const selectedEvents = watch('events');

  const endpoints = data?.data ?? [];

  const toggleEvent = (ev: string) => {
    const next = selectedEvents.includes(ev)
      ? selectedEvents.filter((e) => e !== ev)
      : [...selectedEvents, ev];
    setValue('events', next, { shouldValidate: true });
  };

  const onSubmit = async (form: FormData) => {
    await create({ ...form, active: true }).unwrap();
    reset();
    setOpen(false);
    toast.success(t('webhooks.created'));
  };

  const onTest = async (id: string) => {
    await test(id).unwrap();
    toast.success(t('webhooks.testSent'));
  };

  const onToggleActive = async (ep: WebhookEndpoint) => {
    await update({ id: ep.id, data: { active: !ep.isActive } });
  };

  const onDelete = async (id: string) => {
    if (window.confirm(t('webhooks.deleteConfirm'))) await remove(id);
  };

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('webhooks.title')}</h1>
        <Can permission="webhooks:create">
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('webhooks.add')}
          </Button>
        </Can>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">{t('webhooks.subtitle')}</p>

      {isLoading && <PageSpinner />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t('webhooks.failedToLoad')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>{t('webhooks.events')}</TableHead>
              <TableHead>{t('webhooks.active')}</TableHead>
              <TableHead className="text-right">{t('common.action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {endpoints.map((ep) => (
              <TableRow key={ep.id}>
                <TableCell className="break-all font-mono text-xs">{ep.url}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {ep.events.map((e) => (
                      <Badge key={e} variant="outline" className="font-mono text-xs">
                        {e}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Can
                    permission="webhooks:update"
                    fallback={<StatusBadge status={ep.isActive ? 'ACTIVE' : 'ARCHIVED'} />}
                  >
                    <Switch checked={ep.isActive} onCheckedChange={() => onToggleActive(ep)} />
                  </Can>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={t('webhooks.viewDeliveries')}
                    onClick={() => setDeliveriesFor(ep)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Can permission="webhooks:update">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={t('webhooks.test')}
                      onClick={() => onTest(ep.id)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </Can>
                  <Can permission="webhooks:delete">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title={t('common.delete')}
                      onClick={() => onDelete(ep.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Can>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && endpoints.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  {t('webhooks.none')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('webhooks.add')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label={t('webhooks.url')} htmlFor="wh-url" error={errors.url?.message}>
              <Input id="wh-url" placeholder="https://example.com/hooks/rental" {...register('url')} />
            </Field>
            <Field label={t('webhooks.secret')} htmlFor="wh-secret" error={errors.secret?.message}>
              <Input id="wh-secret" {...register('secret')} />
              {!errors.secret && (
                <p className="text-xs text-muted-foreground">{t('webhooks.secretHint')}</p>
              )}
            </Field>
            <div>
              <p className="mb-2 text-sm font-medium">{t('webhooks.events')}</p>
              <div className="space-y-2">
                {WEBHOOK_EVENTS.map((ev) => (
                  <div key={ev} className="flex items-center gap-2">
                    <Checkbox
                      id={`ev-${ev}`}
                      checked={selectedEvents.includes(ev)}
                      onCheckedChange={() => toggleEvent(ev)}
                    />
                    <Label htmlFor={`ev-${ev}`} className="font-mono text-sm font-normal">
                      {ev}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.events && (
                <p className="mt-1 text-xs text-destructive">{t('webhooks.selectAtLeastOne')}</p>
              )}
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

      {deliveriesFor && <DeliveriesDialog endpoint={deliveriesFor} onClose={() => setDeliveriesFor(null)} />}
    </div>
  );
}
