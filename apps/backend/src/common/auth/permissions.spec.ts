import { hasPermission, ROLE_GRANTS } from './permissions';

describe('hasPermission (backend RBAC glob matcher)', () => {
  describe('wildcard roles', () => {
    it.each(['OWNER', 'CO_OWNER', 'SYSTEM'])('%s is granted everything', (role) => {
      expect(hasPermission(role, 'apartments:create')).toBe(true);
      expect(hasPermission(role, 'webhooks:delete')).toBe(true);
      expect(hasPermission(role, 'anything:at.all')).toBe(true);
    });
  });

  describe('null / unknown roles', () => {
    it('denies when role is null or undefined', () => {
      expect(hasPermission(null, 'apartments:read')).toBe(false);
      expect(hasPermission(undefined, 'apartments:read')).toBe(false);
    });

    it('denies an unregistered role', () => {
      expect(hasPermission('PHANTOM', 'apartments:read')).toBe(false);
    });
  });

  describe('ACCOUNTANT (read/export only)', () => {
    it('grants reads and exports', () => {
      expect(hasPermission('ACCOUNTANT', 'apartments:read')).toBe(true);
      expect(hasPermission('ACCOUNTANT', 'rent:read.assigned')).toBe(true);
      expect(hasPermission('ACCOUNTANT', 'repairs:export')).toBe(true);
      expect(hasPermission('ACCOUNTANT', 'audit:read')).toBe(true);
    });

    it('denies mutations', () => {
      expect(hasPermission('ACCOUNTANT', 'apartments:create')).toBe(false);
      expect(hasPermission('ACCOUNTANT', 'rent:update')).toBe(false);
      expect(hasPermission('ACCOUNTANT', 'leases:delete')).toBe(false);
    });
  });

  describe('MAINTENANCE_COORDINATOR', () => {
    it('has full repairs/contractors but only reads apartments/tenants', () => {
      expect(hasPermission('MAINTENANCE_COORDINATOR', 'repairs:create')).toBe(true);
      expect(hasPermission('MAINTENANCE_COORDINATOR', 'repairs:delete')).toBe(true);
      expect(hasPermission('MAINTENANCE_COORDINATOR', 'contractors:update')).toBe(true);
      expect(hasPermission('MAINTENANCE_COORDINATOR', 'apartments:read')).toBe(true);
      expect(hasPermission('MAINTENANCE_COORDINATOR', 'apartments:create')).toBe(false);
      expect(hasPermission('MAINTENANCE_COORDINATOR', 'tenants:delete')).toBe(false);
    });
  });

  describe('glob semantics', () => {
    it('`*` matches any run of characters including dots', () => {
      // repairs:*.assigned should match repairs:update.assigned
      expect(hasPermission('MANAGER', 'repairs:update.assigned')).toBe(true);
    });

    it('matches are anchored — no partial-string false positives', () => {
      // ACCOUNTANT has `*:read` but not a bare `read` or `xread`
      expect(hasPermission('ACCOUNTANT', 'apartments:readx')).toBe(false);
      expect(hasPermission('ACCOUNTANT', 'xapartments:read.self')).toBe(true); // *:read.* matches
    });
  });

  it('every role in the registry compiles without throwing', () => {
    for (const role of Object.keys(ROLE_GRANTS)) {
      expect(() => hasPermission(role, 'apartments:read')).not.toThrow();
    }
  });
});
