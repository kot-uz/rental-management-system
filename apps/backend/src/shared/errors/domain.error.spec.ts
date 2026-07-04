import { HttpStatus } from '@nestjs/common';
import {
  DomainError,
  AuthError,
  notFound,
  crossOrg,
  permissionDenied,
  scopeViolation,
  versionConflict,
  periodLocked,
  deleteBlocked,
} from './domain.error';
import { ErrorCodes } from './error-codes';

/** Reads back the canonical envelope serialised into the HttpException body. */
const body = (e: DomainError) => e.getResponse() as Record<string, unknown>;

describe('domain error factories', () => {
  it('notFound → 404 ENTITY_001 with entityType/id detail', () => {
    const e = notFound('Lease', 'abc');
    expect(e.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(body(e)).toMatchObject({
      code: ErrorCodes.ENTITY_001,
      statusCode: HttpStatus.NOT_FOUND,
      message: 'Lease not found',
      detail: { entityType: 'Lease', id: 'abc' },
    });
  });

  it('crossOrg → 404 AUTHZ_001 (hides existence)', () => {
    const e = crossOrg();
    expect(e.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(body(e)).toMatchObject({ code: ErrorCodes.AUTHZ_001 });
  });

  it('permissionDenied → 403 AUTHZ_002 carrying detail', () => {
    const e = permissionDenied({ required: 'rent:update', role: 'MANAGER' });
    expect(e.getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(body(e)).toMatchObject({
      code: ErrorCodes.AUTHZ_002,
      detail: { required: 'rent:update', role: 'MANAGER' },
    });
  });

  it('scopeViolation → 403 AUTHZ_003', () => {
    expect(scopeViolation().getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(body(scopeViolation())).toMatchObject({ code: ErrorCodes.AUTHZ_003 });
  });

  it('versionConflict → 409 CONFLICT_001 with current snapshot', () => {
    const e = versionConflict({ version: 3 });
    expect(e.getStatus()).toBe(HttpStatus.CONFLICT);
    expect(body(e)).toMatchObject({
      code: ErrorCodes.CONFLICT_001,
      detail: { current: { version: 3 } },
    });
  });

  it('periodLocked → 409 CONFLICT_002 with {year, month}', () => {
    const e = periodLocked(2026, 6);
    expect(e.getStatus()).toBe(HttpStatus.CONFLICT);
    expect(body(e)).toMatchObject({
      code: ErrorCodes.CONFLICT_002,
      detail: { period: { year: 2026, month: 6 } },
    });
  });

  it('deleteBlocked → 409 with the supplied code/detail', () => {
    const e = deleteBlocked('ENTITY_002', { reason: 'has active lease' });
    expect(e.getStatus()).toBe(HttpStatus.CONFLICT);
    expect(body(e)).toMatchObject({
      code: ErrorCodes.ENTITY_002,
      detail: { reason: 'has active lease' },
    });
  });

  it('AuthError defaults to 401', () => {
    const e = new AuthError(ErrorCodes.AUTH_002, { lockedUntil: 'soon' });
    expect(e.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(body(e)).toMatchObject({
      code: ErrorCodes.AUTH_002,
      detail: { lockedUntil: 'soon' },
    });
  });
});
