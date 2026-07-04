import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface CanProps {
  /** A single permission string, or several (any-match by default). */
  permission: string | string[];
  /** Require ALL listed permissions instead of any. */
  requireAll?: boolean;
  children: React.ReactNode;
  /** Rendered when the check fails. Defaults to nothing. */
  fallback?: React.ReactNode;
}

/**
 * Conditionally renders children based on the current user's permissions.
 * Example: <Can permission="apartments:delete"><DeleteButton /></Can>
 */
export function Can({ permission, requireAll = false, children, fallback = null }: CanProps): React.ReactElement {
  const { can } = usePermissions();
  const perms = Array.isArray(permission) ? permission : [permission];
  const allowed = requireAll ? perms.every(can) : perms.some(can);
  return <>{allowed ? children : fallback}</>;
}
