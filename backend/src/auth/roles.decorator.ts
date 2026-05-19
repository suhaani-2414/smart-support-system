import { SetMetadata } from '@nestjs/common';
import { Role } from '../users/enums/role.enum';

/**
 * Key under which the @Roles() decorator stores its allowed-roles list.
 * Exported so RolesGuard can read it back via Reflector.getAllAndOverride.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator factory that attaches a list of allowed roles to a route
 * handler. Pure metadata — by itself it does nothing. RolesGuard is
 * what reads this metadata and enforces it.
 *
 * Example:
 *   @Roles(Role.ADMIN, Role.AGENT)
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Get('something')
 *   handler() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);