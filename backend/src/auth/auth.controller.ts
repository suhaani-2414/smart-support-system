import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './auth.guard';

/**
 * Three public endpoints under /auth. Signup and login are unauthenticated
 * (you can't have a token to log in WITH if you can't log in). Logout
 * requires a valid token — there's no point logging out if you weren't
 * logged in.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/signup
   * Creates a new account with role 'user'. Admins can override the role
   * at approval time. Returns the created user (minus password hash).
   *
   * 201 Created is Nest's default for POST, which is what we want here.
   */
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  /**
   * POST /auth/login
   * Returns { accessToken: "..." } on success.
   *
   * @HttpCode(200) overrides Nest's POST default of 201 — login is a
   * read-modify-no-resource-created flow, so 200 is more semantically
   * accurate.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /**
   * POST /auth/logout
   * Returns a confirmation message. Because tokens are stateless, the
   * actual "logout" happens on the client (it discards the JWT).
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout() {
    return this.authService.logout();
  }
}