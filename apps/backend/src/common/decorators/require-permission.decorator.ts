import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

/** Marks a route as requiring a specific permission string (see permissions-matrix §4). */
export const RequirePermission = (
  permission: string,
): ReturnType<typeof SetMetadata> => SetMetadata(PERMISSION_KEY, permission);
