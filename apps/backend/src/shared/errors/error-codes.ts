/**
 * Canonical error codes — single source of truth.
 * Mirrors docs/backend/error-catalog.md. Adding a new code requires updating
 * both this file and the catalog.
 */
export const ErrorCodes = {
  // Auth (401)
  AUTH_001: 'AUTH_001',
  AUTH_002: 'AUTH_002',
  AUTH_003: 'AUTH_003',
  AUTH_004: 'AUTH_004',
  AUTH_005: 'AUTH_005',
  // Authorization (403 / 404)
  AUTHZ_001: 'AUTHZ_001',
  AUTHZ_002: 'AUTHZ_002',
  AUTHZ_003: 'AUTHZ_003',
  // Validation (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  // Entity (404 / 409)
  ENTITY_001: 'ENTITY_001',
  ENTITY_002: 'ENTITY_002',
  ENTITY_003: 'ENTITY_003',
  ENTITY_004: 'ENTITY_004',
  ENTITY_005: 'ENTITY_005',
  // Conflict (409)
  CONFLICT_001: 'CONFLICT_001',
  CONFLICT_002: 'CONFLICT_002',
  CONFLICT_003: 'CONFLICT_003',
  // Lease (409 / 422)
  LEASE_001: 'LEASE_001',
  LEASE_002: 'LEASE_002',
  LEASE_003: 'LEASE_003',
  // Money (422)
  MONEY_001: 'MONEY_001',
  MONEY_002: 'MONEY_002',
  MONEY_003: 'MONEY_003',
  // Rent (409)
  RENT_001: 'RENT_001',
  RENT_002: 'RENT_002',
  // File (400 / 410 / 413 / 422)
  FILE_001: 'FILE_001',
  FILE_002: 'FILE_002',
  FILE_003: 'FILE_003',
  FILE_004: 'FILE_004',
  FILE_005: 'FILE_005',
  // Rate limit (429)
  RATE_LIMIT: 'RATE_LIMIT',
  // System (501 / 503)
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/** Default human-readable messages per code (catalog "Message" column). */
export const ErrorMessages: Record<ErrorCode, string> = {
  AUTH_001: 'Invalid credentials',
  AUTH_002: 'Account temporarily locked',
  AUTH_003: 'Token expired',
  AUTH_004: 'Token invalid',
  AUTH_005: 'Session revoked — please log in again',
  AUTHZ_001: 'Not found',
  AUTHZ_002: 'Permission denied',
  AUTHZ_003: 'Scope violation',
  VALIDATION_ERROR: 'Validation failed',
  ENTITY_001: 'Resource not found',
  ENTITY_002: 'Delete blocked by active lease',
  ENTITY_003: 'Delete blocked by active lease',
  ENTITY_004: 'Delete blocked by non-archived repairs',
  ENTITY_005: 'Restore window expired',
  CONFLICT_001: 'Version conflict — please refresh and retry',
  CONFLICT_002: 'Accounting period is locked',
  CONFLICT_003: 'Idempotency key already used',
  LEASE_001: 'Apartment already has an active lease',
  LEASE_002: 'Lease is not in the correct state for this action',
  LEASE_003: 'Tenant share percents must sum to 100',
  MONEY_001: 'Amount must be a positive integer',
  MONEY_002: 'Currency code mismatch',
  MONEY_003: 'Overpayment exceeds period balance',
  RENT_001: 'Period is already fully paid',
  RENT_002: 'Void requires a reason',
  FILE_001: 'File exceeds maximum size',
  FILE_002: 'Invalid or disallowed file type',
  FILE_003: 'Upload slot expired',
  FILE_004: 'File not yet finalized',
  FILE_005: 'File size mismatch on finalize',
  RATE_LIMIT: 'Too many requests',
  NOT_IMPLEMENTED: 'This feature is not available in the current plan',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
};
