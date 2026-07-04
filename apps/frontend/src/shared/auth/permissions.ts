/**
 * Frontend RBAC — mirrors docs/product/permissions-matrix.md §4.
 *
 * MVP implements only OWNER (and the SYSTEM job identity, which has no UI).
 * The remaining roles are *designed* here so the gating infrastructure is
 * complete; activating them in M2 is just a matter of issuing those roles.
 *
 * Grants are glob patterns where `*` matches any run of characters, so
 * `repairs:*` covers `repairs:update.financial`, and `*:read` covers every
 * resource's read. This is UI gating only — the backend remains authoritative.
 */
export type Role =
  | 'OWNER'
  | 'CO_OWNER'
  | 'SYSTEM'
  | 'MANAGER'
  | 'ACCOUNTANT'
  | 'MAINTENANCE_COORDINATOR'
  | 'TENANT';

const ROLE_GRANTS: Record<Role, string[]> = {
  // Full control over the Org (implemented in MVP).
  OWNER: ['*'],
  CO_OWNER: ['*'],
  SYSTEM: ['*'],

  // Org-wide read + financial export, no operational mutations (M2).
  ACCOUNTANT: ['*:read', '*:read.*', '*:export', 'audit:read'],

  // Repairs & contractors across the Org; read-only on apartments/tenants (M2).
  MAINTENANCE_COORDINATOR: [
    'repairs:*',
    'contractors:*',
    'apartments:read',
    'tenants:read',
    'notifications:read.self',
    'notifications:update.self',
  ],

  // Operational management limited to assigned apartments (M2).
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

  // Read-only self portal (M3).
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

// Precompile grant patterns once per role.
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
