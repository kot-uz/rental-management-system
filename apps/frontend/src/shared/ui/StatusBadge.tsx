import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

const STATUS_COLORS: Record<string, ChipProps['color']> = {
  OCCUPIED: 'success',
  ACTIVE: 'success',
  PAID: 'success',
  CONFIRMED: 'success',
  COMPLETED: 'success',
  SUCCESS: 'success',
  PENDING: 'warning',
  FAILED: 'error',
  RETURNED: 'success',
  HELD: 'info',
  PARTIALLY_RETURNED: 'warning',
  FORFEITED: 'error',
  LOCKED: 'error',
  UNLOCKED: 'success',
  VACANT: 'warning',
  PARTIAL: 'warning',
  IN_PROGRESS: 'warning',
  WAITING: 'warning',
  UNPAID: 'error',
  OVERDUE: 'error',
  OPEN: 'error',
  CRITICAL: 'error',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'default',
  TERMINATED: 'default',
  EXPIRED: 'default',
  ARCHIVED: 'default',
  CANCELED: 'default',
  VOIDED: 'default',
};

export function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const { t } = useTranslation();
  const color = STATUS_COLORS[status] ?? 'default';
  const label = t(`status.${status}`, { defaultValue: status.replace(/_/g, ' ') });
  return <Chip label={label} color={color} size={size} />;
}
