import React, { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useGetTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  Tag,
} from '../../entities/tags/api/tagsApi';
import { Can } from '../../shared/ui/Can';
import { Field } from '../../shared/ui/Field';
import { PageSpinner } from '../../shared/ui/Spinner';
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
import { cn } from '@/lib/utils';

const PRESET_COLORS = ['#607d8b', '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#f44336', '#009688'];

function contrast(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#000' : '#fff';
}

function TagChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: color, color: contrast(color) }}
    >
      {name}
    </span>
  );
}

export function TagsPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useGetTagsQuery();
  const [createTag, { isLoading: creating }] = useCreateTagMutation();
  const [updateTag, { isLoading: updating }] = useUpdateTagMutation();
  const [deleteTag] = useDeleteTagMutation();

  const [editing, setEditing] = useState<Tag | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [formError, setFormError] = useState<string | null>(null);

  const tags = data?.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setName('');
    setColor(PRESET_COLORS[0]);
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (tag: Tag) => {
    setEditing(tag);
    setName(tag.name);
    setColor(tag.color ?? PRESET_COLORS[0]);
    setFormError(null);
    setOpen(true);
  };

  const onSubmit = async () => {
    if (!name.trim()) return;
    setFormError(null);
    try {
      if (editing) {
        await updateTag({ id: editing.id, name: name.trim(), color }).unwrap();
      } else {
        await createTag({ name: name.trim(), color }).unwrap();
      }
      setOpen(false);
    } catch (e) {
      const status = (e as { status?: number }).status;
      setFormError(status === 409 ? t('tags.duplicate') : t('tags.saveError'));
    }
  };

  const onDelete = async (tag: Tag) => {
    const msg = tag.usageCount
      ? t('tags.deleteConfirmUsed', { count: tag.usageCount })
      : t('tags.deleteConfirm');
    if (window.confirm(msg)) await deleteTag(tag.id);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('tags.title')}</h1>
        <Can permission="tags:create">
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('tags.add')}
          </Button>
        </Can>
      </div>

      {isLoading && <PageSpinner />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t('tags.failedToLoad')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('tags.tag')}</TableHead>
              <TableHead className="text-right">{t('tags.usage')}</TableHead>
              <TableHead className="text-right">{t('common.action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell>
                  <TagChip name={tag.name} color={tag.color ?? '#607d8b'} />
                </TableCell>
                <TableCell className="text-right">{tag.usageCount ?? 0}</TableCell>
                <TableCell className="text-right">
                  <Can permission="tags:update">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={t('common.edit')}
                      onClick={() => openEdit(tag)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Can>
                  <Can permission="tags:delete">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title={t('common.delete')}
                      onClick={() => onDelete(tag)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Can>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && tags.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  {t('tags.none')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? t('tags.edit') : t('tags.add')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label={t('tags.name')} htmlFor="tag-name">
              <Input id="tag-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">{t('tags.color')}</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                      color === c ? 'border-foreground' : 'border-transparent',
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <TagChip name={name || t('tags.preview')} color={color} />
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onSubmit} disabled={creating || updating || !name.trim()}>
              {(creating || updating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
