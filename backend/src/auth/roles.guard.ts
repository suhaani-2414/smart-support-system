import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role } from '../users/enums/role.enum';

/**
 * Enforces the role restrictions declared via @Roles(...). Two design
 * choices worth knowing:
 *
 *   1. It MUST run after JwtAuthGuard. The role check reads req.user.role,
 *      which is only populated after JWT verification. The standard pattern
 *      is `@UseGuards(JwtAuthGuard, RolesGuard)` — Nest runs them left-to-right.
 *
 *   2. ADMIN bypasses every role check. Simpler than having to add ADMIN
 *      to every @Roles list, and matches the principle that admins have
 *      blanket access.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Pulls the @Roles metadata from either the handler or the controller
    // class — getAllAndOverride lets a handler-level decorator override
    // a class-level one if both are present.
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Routes without @Roles() are open to any authenticated user.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: { role: Role } }>();

    // Admin override — they pass every role check.
    if (user?.role === Role.ADMIN) {
      return true;
    }

    const hasRole = requiredRoles.some((role) => user?.role === role);
    if (!hasRole) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }
    return true;
  }
}