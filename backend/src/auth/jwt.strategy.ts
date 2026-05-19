import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * The shape of the JSON Web Token payload that this app signs and
 * verifies. Keep small — JWTs travel with every request, so payload
 * bloat directly increases bandwidth on every call.
 *
 *   sub:   the user id (standard JWT claim for "subject")
 *   email: convenient duplicate so controllers don't always need a DB lookup
 *   role:  for RolesGuard to enforce permissions without a DB lookup
 */
export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

/**
 * Passport strategy for verifying incoming JWTs. Tied into Nest via
 * PassportStrategy — once registered, `@UseGuards(AuthGuard('jwt'))`
 * (or our JwtAuthGuard wrapper) will invoke this strategy automatically
 * for protected routes.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // Extract from `Authorization: Bearer <token>` header.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Reject expired tokens (default, listed explicitly for clarity).
      ignoreExpiration: false,
      // The same secret AuthService uses to SIGN tokens. getOrThrow makes
      // the app fail loudly at startup if JWT_SECRET isn't configured —
      // far better than silently signing with `undefined`.
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Called by Passport after signature verification succeeds. Whatever
   * we return here becomes req.user on the request object.
   *
   * Returning `id` and `sub` both is just convenience — some downstream
   * code looks for `user.sub` (matching the JWT spec) and some for
   * `user.id` (matching the entity field name).
   */
  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}