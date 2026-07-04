import { useCallback } from 'react';
import { useAppSelector } from './useAppSelector';
import { hasPermission } from '../auth/permissions';

/**
 * Returns the current user's role and a `can(permission)` checker.
 * UI gating only — the backend stays authoritative.
 */
export function usePermissions() {
  const role = useAppSelector((s) => s.auth.user?.role) ?? null;
  const can = useCallback((permission: string) => hasPermission(role, permission), [role]);
  return { role, can };
}
