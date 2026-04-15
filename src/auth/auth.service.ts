import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { Role } from '../users/enums/role.enum';
import { SignupDto } from './dto/signup.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user account.
   * Passwords are hashed with bcrypt before persistence.
   */
  async signup(dto: SignupDto, role: Role = Role.USER) {
    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role,
    });

    // Omit password from the returned object
    const { ...result } = user;
    return result;
  }

  /**
   * Validate credentials and return a signed JWT.
   * Never expose why a login failed beyond "Invalid credentials"
   * to prevent user enumeration.
   */
  async login(email: string, password: string) {
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
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
