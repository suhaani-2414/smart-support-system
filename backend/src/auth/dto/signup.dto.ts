import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * The shape of POST /auth/signup bodies.
 *
 * Password constraints: 8–72 characters. The lower bound is a basic
 * security floor; the upper bound (72) is bcrypt's actual maximum — it
 * silently truncates anything longer, so we reject early instead of
 * letting users think they're using a 100-character password that's
 * really only the first 72.
 */
export class SignupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}