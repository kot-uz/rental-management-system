import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  CircularProgress,
  Alert,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useGetAuditLogsQuery, AuditLogEntry } from '../../entities/audit/api/auditApi';
import { formatDate } from '../../shared/utils/formatMoney';

const ENTITY_TYPES = ['apartment', 'tenant', 'lease', 'repair', 'contractor'];

export function AuditLogPage() {
  const { t } = useTranslation();
  const [entityType, setEntityType] = useState('');

  const { data, isLoading, error } = useGetAuditLogsQuery({
    entityType: entityType || undefined,
    limit: 100,
  });
  const logs = (data?.data ?? []) as AuditLogEntry[];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5">{t('audit.title')}</Typography>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>{t('audit.entityType')}</InputLabel>
          <Select value={entityType} onChange={(e) => setEntityType(e.target.value)} label={t('audit.entityType')}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {ENTITY_TYPES.map((tp) => (
              <MenuItem key={tp} value={tp}>
                {t(`search.type.${tp}`, tp)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {isLoading && (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{t('audit.failedToLoad')}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('common.date')}</TableCell>
              <TableCell>{t('audit.action')}</TableCell>
              <TableCell>{t('audit.entity')}</TableCell>
              <TableCell>{t('audit.entityId')}</TableCell>
              <TableCell>{t('audit.ip')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell>{formatDate(log.createdAt)}</TableCell>
                <TableCell>
                  <Chip label={log.action} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{t(`search.type.${log.entityType}`, log.entityType)}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {log.entityId.slice(0, 8)}…
                </TableCell>
                <TableCell>{log.ip ?? '—'}</TableCell>
              </TableRow>
            ))}
            {!isLoading && logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {t('audit.noEntries')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
