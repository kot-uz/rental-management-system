import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetAuditLogsQuery, AuditLogEntry } from '../../entities/audit/api/auditApi';
import { formatDate } from '../../shared/utils/formatMoney';
import { PageSpinner } from '../../shared/ui/Spinner';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ENTITY_TYPES = ['apartment', 'tenant', 'lease', 'repair', 'contractor'];
const ALL = '__all__';

export function AuditLogPage() {
  const { t } = useTranslation();
  const [entityType, setEntityType] = useState('');

  const { data, isLoading, error } = useGetAuditLogsQuery({
    entityType: entityType || undefined,
    limit: 100,
  });
  const logs = (data?.data ?? []) as AuditLogEntry[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('audit.title')}</h1>
        <Select value={entityType || ALL} onValueChange={(v) => setEntityType(v === ALL ? '' : v)}>
          <SelectTrigger className="h-9 w-48">
            <SelectValue placeholder={t('audit.entityType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('common.all')}</SelectItem>
            {ENTITY_TYPES.map((tp) => (
              <SelectItem key={tp} value={tp}>
                {t(`search.type.${tp}`, tp)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <PageSpinner />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{t('audit.failedToLoad')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.date')}</TableHead>
              <TableHead>{t('audit.action')}</TableHead>
              <TableHead>{t('audit.entity')}</TableHead>
              <TableHead>{t('audit.entityId')}</TableHead>
              <TableHead>{t('audit.ip')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{formatDate(log.createdAt)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{log.action}</Badge>
                </TableCell>
                <TableCell>{t(`search.type.${log.entityType}`, log.entityType)}</TableCell>
                <TableCell className="font-mono text-xs">{log.entityId.slice(0, 8)}…</TableCell>
                <TableCell>{log.ip ?? '—'}</TableCell>
              </TableRow>
            ))}
            {!isLoading && logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {t('audit.noEntries')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
