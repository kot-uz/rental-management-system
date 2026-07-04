import { describe, it, expect } from 'vitest';
import { hasPermission } from './permissions';

describe('hasPermission', () => {
  it('denies when role is null/undefined/empty', () => {
    expect(hasPermission(null, 'apartments:read')).toBe(false);
    expect(hasPermission(undefined, 'apartments:read')).toBe(false);
    expect(hasPermission('', 'apartments:read')).toBe(false);
  });

  it('denies an unknown role', () => {
    expect(hasPermission('GHOST', 'apartments:read')).toBe(false);
  });

  it('grants everything to OWNER via the "*" wildcard', () => {
    expect(hasPermission('OWNER', 'apartments:read')).toBe(true);
    expect(hasPermission('OWNER', 'webhooks:delete')).toBe(true);
    expect(hasPermission('OWNER', 'anything:at:all')).toBe(true);
  });

  it('grants everything to CO_OWNER and SYSTEM as well', () => {
    expect(hasPermission('CO_OWNER', 'rent:export')).toBe(true);
    expect(hasPermission('SYSTEM', 'audit:read')).toBe(true);
  });

  it('expands a resource glob: repairs:* covers nested actions', () => {
    expect(hasPermission('MAINTENANCE_COORDINATOR', 'repairs:update.financial')).toBe(true);
    expect(hasPermission('MAINTENANCE_COORDINATOR', 'contractors:create')).toBe(true);
  });

  it('expands an action glob: *:read covers any resource read', () => {
    expect(hasPermission('ACCOUNTANT', 'apartments:read')).toBe(true);
    expect(hasPermission('ACCOUNTANT', 'rent:read')).toBe(true);
    expect(hasPermission('ACCOUNTANT', 'anything:read')).toBe(true);
  });

  it('grants ACCOUNTANT exports but denies operational mutations', () => {
    expect(hasPermission('ACCOUNTANT', 'rent:export')).toBe(true);
    expect(hasPermission('ACCOUNTANT', 'repairs:create')).toBe(false);
    expect(hasPermission('ACCOUNTANT', 'apartments:delete')).toBe(false);
  });

  it('matches an exact (non-glob) grant', () => {
    expect(hasPermission('MAINTENANCE_COORDINATOR', 'apartments:read')).toBe(true);
    // Only :read is granted exactly — not :update.
    expect(hasPermission('MAINTENANCE_COORDINATOR', 'apartments:update')).toBe(false);
  });

  it('does not let a glob bleed past the colon separator', () => {
    // ACCOUNTANT has "*:read" — "apartmentsread" (no colon) must not match.
    expect(hasPermission('ACCOUNTANT', 'apartmentsread')).toBe(false);
  });

  it('anchors the pattern: a grant must match the whole permission', () => {
    // MANAGER has "apartments:read.assigned"; the bare "apartments:read"
    // is a different, narrower permission and must not match.
    expect(hasPermission('MANAGER', 'apartments:read')).toBe(false);
    expect(hasPermission('MANAGER', 'apartments:read.assigned')).toBe(true);
  });
});
