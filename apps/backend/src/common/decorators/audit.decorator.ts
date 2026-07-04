import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditMeta {
  entityType: string;
  action?: string;
}

/**
 * Marks a mutating route for automatic audit logging. The interceptor derives
 * the action from the HTTP method unless `action` is supplied.
 */
export const Audit = (
  entityType: string,
  action?: string,
): ReturnType<typeof SetMetadata> => SetMetadata(AUDIT_KEY, { entityType, action });
