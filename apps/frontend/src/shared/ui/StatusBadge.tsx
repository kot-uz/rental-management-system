import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Tone = 'success' | 'warning' | 'error' | 'info' | 'default';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

const STATUS_TONES: Record<string, Tone> = {
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

const TONE_CLASSES: Record<Tone, string> = {
  success:
    'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  warning:
    'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  error: 'border-transparent bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300',
  info: 'border-transparent bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300',
  default: 'border-transparent bg-muted text-muted-foreground',
};

export function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const { t } = useTranslation();
  const tone = STATUS_TONES[status] ?? 'default';
  const label = t(`status.${status}`, { defaultValue: status.replace(/_/g, ' ') });
  return (
    <Badge
      variant="outline"
      data-tone={tone}
      data-size={size}
      className={cn(
        'whitespace-nowrap font-medium',
        size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        TONE_CLASSES[tone],
      )}
    >
      {label}
    </Badge>
  );
}
