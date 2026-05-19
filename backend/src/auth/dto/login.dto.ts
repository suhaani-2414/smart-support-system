import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * The shape of POST /auth/login bodies. The global ValidationPipe checks
 * incoming JSON against these decorators and rejects bad input with a
 * 400 before the controller ever sees the request.
 *
 * Deliberately no MinLength on password here — we want the same generic
 * "invalid credentials" response for any bad input, so attackers can't
 * use error-message variation to enumerate which emails exist.
 */
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}