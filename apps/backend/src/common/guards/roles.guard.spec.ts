import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../constants/roles.enum';

function ctx(user: { role?: string } | undefined): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function reflectorReturning(roles: Role[] | undefined): Reflector {
  return { getAllAndOverride: jest.fn().mockReturnValue(roles) } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('allows routes without @Roles metadata', () => {
    expect(new RolesGuard(reflectorReturning(undefined)).canActivate(ctx({ role: 'MANAGER' }))).toBe(true);
  });

  it('allows routes with an empty @Roles list', () => {
    expect(new RolesGuard(reflectorReturning([])).canActivate(ctx({ role: 'MANAGER' }))).toBe(true);
  });

  it('allows a user whose role is in the required set', () => {
    expect(new RolesGuard(reflectorReturning([Role.OWNER])).canActivate(ctx({ role: 'OWNER' }))).toBe(true);
  });

  it('denies a user whose role is not in the required set', () => {
    expect(new RolesGuard(reflectorReturning([Role.OWNER])).canActivate(ctx({ role: 'MANAGER' }))).toBe(false);
  });

  it('denies when there is no authenticated user', () => {
    expect(new RolesGuard(reflectorReturning([Role.OWNER])).canActivate(ctx(undefined))).toBe(false);
  });
});
