/**
 * Backend RBAC registry — authoritative counterpart to the frontend's
 * shared/auth/permissions.ts. Mirrors docs/product/permissions-matrix.md §4.
 *
 * MVP issues only OWNER (and the SYSTEM job identity). The other roles are
 * designed here so PermissionsGuard enforces them the moment those roles are
 * granted in M2 — no guard rewrites required.
 *
 * Grants are glob patterns where `*` matches any run of characters.
 */
export const ROLE_GRANTS: Record<string, string[]> = {
  OWNER: ['*'],
  CO_OWNER: ['*'],
  SYSTEM: ['*'],

  ACCOUNTANT: ['*:read', '*:read.*', '*:export', 'audit:read'],

  MAINTENANCE_COORDINATOR: [
    'repairs:*',
    'contractors:*',
    'apartments:read',
    'tenants:read',
    'notifications:read.self',
    'notifications:update.self',
  ],

  MANAGER: [
    'apartments:read.assigned',
    'apartments:update.assigned',
    'tenants:read.assigned',
    'leases:read.assigned',
    'leases:update.assigned',
    'rent:read.assigned',
    'utility-readings:*.assigned',
    'utility-bills:read.assigned',
    'repairs:*.assigned',
    'repairs:read.assigned',
    'contractors:read.assigned-context',
    'notifications:read.self',
    'notifications:update.self',
  ],

  TENANT: [
    'leases:read.self',
    'rent:read.self',
    'utility-bills:read.self',
    'repairs:read.self.limited',
    'notifications:read.self',
    'notifications:update.self',
    'user:read.self',
    'user:update.self',
  ],
};

function grantToRegExp(grant: string): RegExp {
  const escaped = grant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

const COMPILED: Record<string, RegExp[]> = Object.fromEntries(
  Object.entries(ROLE_GRANTS).map(([role, grants]) => [role, grants.map(grantToRegExp)]),
);

/** True if `role` is granted `permission` (exact or glob match). */
export function hasPermission(role: string | null | undefined, permission: string): boolean {
  if (!role) return false;
  const patterns = COMPILED[role];
  if (!patterns) return false;
  return patterns.some((re) => re.test(permission));
}
