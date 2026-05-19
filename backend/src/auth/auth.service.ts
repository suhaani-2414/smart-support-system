import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Role } from '../users/enums/role.enum';
import { SignupDto } from './dto/signup.dto';

/**
 * Cost factor for bcrypt. 12 is the current industry sweet spot:
 *   - 10 rounds = ~10ms hash, weaker against modern GPUs
 *   - 12 rounds = ~150ms hash, current OWASP recommendation
 *   - 14 rounds = ~600ms hash, noticeably slow at login time
 * Higher = slower for both attackers and legitimate logins.
 */
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Signup flow.
   *
   *   1. bcrypt-hash the password (NEVER store plain text).
   *   2. Delegate to UsersService.create, which inserts the row with
   *      isPending=true so the user can't log in yet.
   *   3. Fire a notification (in-app + email) so the user knows their
   *      account is pending approval. Fire-and-forget — a failure in
   *      Resend should never make signup itself fail.
   *   4. Strip the password hash before returning. The DB field is
   *      already select:false on subsequent reads, but a freshly created
   *      entity returned from save() still has it in memory.
   */
  async signup(dto: SignupDto, role: Role = Role.USER) {
    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role,
    });

    void this.notificationsService.notifyAccountCreated(user);

    const safeUser: Record<string, unknown> = { ...user };
    delete safeUser.password;
    return safeUser;
  }

  /**
   * Login flow.
   *
   * Important: every failure path returns the SAME generic message
   * ("Invalid credentials") for both wrong-email and wrong-password so
   * attackers can't enumerate which emails exist in the system. The
   * pending/inactive cases get distinct messages because those are
   * not security-sensitive (the user knows they have an account).
   */
  async login(email: string, password: string) {
    // findByEmailWithPassword uses a query builder that explicitly
    // includes the password hash, which is select:false by default.
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isPending) {
      throw new UnauthorizedException(
        'Your account is pending admin approval. You will be notified by email once approved.',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    // Build a minimal payload — keep tokens small since they ride on
    // every authenticated request. id, email, and role are enough for
    // the guards; anything else can be looked up via UsersService.
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  /**
   * "Logout" for stateless JWT auth is purely client-side: the server
   * doesn't track sessions, so it can't really revoke a token. The
   * client just throws away its copy of the JWT. This endpoint is
   * kept for API symmetry / future use (e.g. server-side token denylist).
   */
  logout() {
    return { message: 'Logged out successfully. Please discard your token.' };
  }
}