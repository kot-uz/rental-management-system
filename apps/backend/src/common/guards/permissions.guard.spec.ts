import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { ErrorCodes } from '../../shared/errors/error-codes';

/** Builds an ExecutionContext exposing `request.user` (the JWT payload). */
function ctx(user: { role?: string } | undefined): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

/** Reflector stub that returns a fixed required-permission for any route. */
function reflectorReturning(required: string | undefined): Reflector {
  return { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
}

describe('PermissionsGuard', () => {
  it('allows routes with no @RequirePermission metadata', () => {
    const guard = new PermissionsGuard(reflectorReturning(undefined));
    expect(guard.canActivate(ctx(undefined))).toBe(true);
  });

  it('allows a wildcard role (OWNER) for any permission', () => {
    const guard = new PermissionsGuard(reflectorReturning('rent:update'));
    expect(guard.canActivate(ctx({ role: 'OWNER' }))).toBe(true);
  });

  it('allows a role that is granted the exact permission', () => {
    const guard = new PermissionsGuard(reflectorReturning('apartments:read'));
    expect(guard.canActivate(ctx({ role: 'ACCOUNTANT' }))).toBe(true);
  });

  it('throws AUTHZ_002 (403) with {required, role} when the role lacks the permission', () => {
    const guard = new PermissionsGuard(reflectorReturning('rent:update'));
    try {
      guard.canActivate(ctx({ role: 'MANAGER' }));
      throw new Error('expected throw');
    } catch (err) {
      const e = err as { getStatus: () => number; getResponse: () => Record<string, unknown> };
      expect(e.getStatus()).toBe(403);
      expect(e.getResponse()).toMatchObject({
        code: ErrorCodes.AUTHZ_002,
        detail: { required: 'rent:update', role: 'MANAGER' },
      });
    }
  });

  it('denies when there is no authenticated user (role null in detail)', () => {
    const guard = new PermissionsGuard(reflectorReturning('apartments:read'));
    try {
      guard.canActivate(ctx(undefined));
      throw new Error('expected throw');
    } catch (err) {
      const e = err as { getResponse: () => Record<string, unknown> };
      expect(e.getResponse()).toMatchObject({ code: ErrorCodes.AUTHZ_002, detail: { role: null } });
    }
  });
});
