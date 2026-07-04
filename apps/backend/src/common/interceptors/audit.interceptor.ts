import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AUDIT_KEY, AuditMeta } from '../decorators/audit.decorator';
import { AuditService } from '../../modules/audit/audit.service';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

const ACTION_BY_METHOD: Record<string, string> = {
  POST: 'create',
  PATCH: 'update',
  PUT: 'update',
  DELETE: 'delete',
};

/**
 * Writes an audit entry after any route decorated with @Audit succeeds.
 * Undecorated routes are untouched. Handles both the raw entity and the
 * `{ data }` envelope when reading the entity id.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<AuditMeta | undefined>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const method = req.method;
    const action = meta.action ?? ACTION_BY_METHOD[method] ?? method.toLowerCase();

    return next.handle().pipe(
      tap((response) => {
        const user = req.user;
        if (!user) return;
        const body = (response as { data?: { id?: string } } | undefined)?.data ?? response;
        const entityId =
          (body as { id?: string } | undefined)?.id ?? (req.params?.['id'] as string) ?? 'unknown';
        void this.audit.record({
          orgId: user.orgId,
          userId: user.sub,
          action,
          entityType: meta.entityType,
          entityId,
          after: method === 'DELETE' ? undefined : body,
          ip: req.ip,
        });
      }),
    );
  }
}
