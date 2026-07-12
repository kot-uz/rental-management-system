import React, { useState } from 'react';
import { AlertTriangle, Eye, Loader2, Trash2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
  useLazyGetDocumentUrlQuery,
  DOCUMENT_TYPES,
} from '../../entities/documents/api/documentsApi';
import { Can } from '../../shared/ui/Can';
import { Field } from '../../shared/ui/Field';
import { formatDate } from '../../shared/utils/formatMoney';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

interface Props {
  ownerType: string;
  ownerId: string;
}

const EXPIRY_WARN_DAYS = 30;

export function DocumentsSection({ ownerType, ownerId }: Props) {
  const { t } = useTranslation();
  const { data, isLoading } = useGetDocumentsQuery({ ownerType, ownerId });
  const [upload, { isLoading: uploading }] = useUploadDocumentMutation();
  const [remove] = useDeleteDocumentMutation();
  const [fetchUrl] = useLazyGetDocumentUrlQuery();

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('OTHER');
  const [expiresAt, setExpiresAt] = useState('');

  const documents = data?.data ?? [];

  const onUpload = async () => {
    if (!file || !title) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('ownerType', ownerType);
    fd.append('ownerId', ownerId);
    fd.append('title', title);
    fd.append('documentType', documentType);
    if (expiresAt) fd.append('expiresAt', expiresAt);
    await upload(fd).unwrap();
    setOpen(false);
    setFile(null);
    setTitle('');
    setDocumentType('OTHER');
    setExpiresAt('');
  };

  const onView = async (id: string) => {
    const res = await fetchUrl(id).unwrap();
    window.open(res.data.url, '_blank', 'noopener');
  };

  const onDelete = async (id: string) => {
    if (window.confirm(t('common.deleteConfirm'))) await remove(id);
  };

  const isExpiringSoon = (iso?: string | null) => {
    if (!iso) return false;
    const days = (new Date(iso).getTime() - Date.now()) / 86_400_000;
    return days <= EXPIRY_WARN_DAYS;
  };

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Can permission="documents:create">
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            {t('documents.upload')}
          </Button>
        </Can>
      </div>

      {isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('documents.titleField')}</TableHead>
              <TableHead>{t('documents.type')}</TableHead>
              <TableHead>{t('documents.expiresAt')}</TableHead>
              <TableHead>{t('documents.file')}</TableHead>
              <TableHead className="text-right">{t('common.action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">{d.documentType}</Badge>
                </TableCell>
                <TableCell>
                  {d.expiresAt ? (
                    <span className="flex items-center gap-1">
                      {isExpiringSoon(d.expiresAt) && (
                        <AlertTriangle
                          className="h-4 w-4 text-amber-500"
                          aria-label={t('documents.expiringSoon')}
                        />
                      )}
                      {formatDate(d.expiresAt)}
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {d.file.originalName}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={t('documents.view')}
                    onClick={() => onView(d.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Can permission="documents:delete">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title={t('common.delete')}
                      onClick={() => onDelete(d.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Can>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {t('documents.none')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('documents.upload')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <input
                id="doc-file-input"
                type="file"
                hidden
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('doc-file-input')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                <span className="truncate">{file ? file.name : t('documents.chooseFile')}</span>
              </Button>
            </div>
            <Field label={t('documents.titleField')} htmlFor="doc-title">
              <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Field>
            <Field label={t('documents.type')}>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((dt) => (
                    <SelectItem key={dt} value={dt}>
                      {dt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('documents.expiresAt')} htmlFor="doc-expires">
              <Input
                id="doc-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onUpload} disabled={uploading || !file || !title}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('documents.upload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
