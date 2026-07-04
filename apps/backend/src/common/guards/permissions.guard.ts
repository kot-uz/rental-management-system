import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { hasPermission } from '../auth/permissions';
import { permissionDenied } from '../../shared/errors/domain.error';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

/**
 * Enforces the permission declared via @RequirePermission against the
 * authenticated user's role. Routes without the decorator are unaffected.
 * Runs after JwtAuthGuard so request.user is populated.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const role = request.user?.role;
    if (!hasPermission(role, required)) {
      throw permissionDenied({ required, role: role ?? null });
    }
    return true;
  }
}
