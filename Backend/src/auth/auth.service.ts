import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { Role } from '../users/enums/role.enum';
import { SignupDto } from './dto/signup.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Register a new user account.
   * Passwords are hashed with bcrypt before persistence.
   * The account starts as pending — an admin must approve it before login.
   * A notification email is sent to the registrant.
   */
  async signup(dto: SignupDto, role: Role = Role.USER) {
    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role,
    });

    // Fire-and-forget — never block signup on email delivery
    void this.mailService.sendAccountCreated(user.name, user.email);

    // Strip the password hash from the response.
    // TypeORM .save() returns the inserted fields including password,
    // even though it's marked `select: false` on the entity.
    const safeUser: Record<string, unknown> = { ...user };
    delete safeUser.password;
    return safeUser;
  }

  /**
   * Validate credentials and return a signed JWT.
   * Blocks pending accounts with a clear message.
   * Never expose why a login failed beyond "Invalid credentials"
   * to prevent user enumeration (except for the explicit pending state,
   * which the user already knows about from registration).
   */
  async login(email: string, password: string) {
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

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  /**
   * JWT is stateless — logout is handled client-side by discarding the token.
   * This endpoint exists to provide a consistent API surface.
   */
  logout() {
    return { message: 'Logged out successfully. Please discard your token.' };
  }
}