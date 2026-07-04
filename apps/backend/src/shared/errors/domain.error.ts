import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorCodes, ErrorMessages } from './error-codes';

/**
 * Base class for all domain errors. Serializes to the canonical error envelope
 * consumed by HttpExceptionFilter: { code, message, statusCode, detail }.
 */
export class DomainError extends HttpException {
  constructor(
    code: ErrorCode,
    message: string = ErrorMessages[code],
    status: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY,
    detail?: Record<string, unknown>,
  ) {
    super({ code, message, statusCode: status, detail }, status);
  }
}

/** 401 family — thrown for authentication failures. */
export class AuthError extends DomainError {
  constructor(
    code: Extract<ErrorCode, `AUTH_${string}`>,
    detail?: Record<string, unknown>,
  ) {
    super(code, ErrorMessages[code], HttpStatus.UNAUTHORIZED, detail);
  }
}

// ─── Convenience factories ─────────────────────────────────────────────────

export const notFound = (entityType: string, id?: string): DomainError =>
  new DomainError(ErrorCodes.ENTITY_001, `${entityType} not found`, HttpStatus.NOT_FOUND, {
    entityType,
    id,
  });

/** Cross-Org access — returns 404 to avoid leaking existence (AUTHZ_001). */
export const crossOrg = (): DomainError =>
  new DomainError(ErrorCodes.AUTHZ_001, ErrorMessages.AUTHZ_001, HttpStatus.NOT_FOUND);

export const permissionDenied = (detail?: Record<string, unknown>): DomainError =>
  new DomainError(ErrorCodes.AUTHZ_002, ErrorMessages.AUTHZ_002, HttpStatus.FORBIDDEN, detail);

export const scopeViolation = (detail?: Record<string, unknown>): DomainError =>
  new DomainError(ErrorCodes.AUTHZ_003, ErrorMessages.AUTHZ_003, HttpStatus.FORBIDDEN, detail);

export const versionConflict = (current: object): DomainError =>
  new DomainError(ErrorCodes.CONFLICT_001, ErrorMessages.CONFLICT_001, HttpStatus.CONFLICT, {
    current,
  });

export const periodLocked = (year: number, month: number): DomainError =>
  new DomainError(ErrorCodes.CONFLICT_002, ErrorMessages.CONFLICT_002, HttpStatus.CONFLICT, {
    period: { year, month },
  });

export const deleteBlocked = (
  code: Extract<ErrorCode, 'ENTITY_002' | 'ENTITY_003' | 'ENTITY_004'>,
  detail: Record<string, unknown>,
): DomainError => new DomainError(code, ErrorMessages[code], HttpStatus.CONFLICT, detail);
