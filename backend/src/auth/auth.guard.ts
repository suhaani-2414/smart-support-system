import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Thin wrapper around Passport's AuthGuard('jwt') that:
 *
 *   1. Triggers the JwtStrategy (validates the bearer token).
 *   2. Customises the failure response — Nest's default would 401 with
 *      "Unauthorized"; we make it slightly more useful with "Invalid or
 *      missing access token".
 *
 * Apply with @UseGuards(JwtAuthGuard) on any route that requires
 * authentication. The strategy populates req.user with the validated
 * payload (see JwtStrategy.validate).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Invalid or missing access token');
    }
    return user;
  }
}