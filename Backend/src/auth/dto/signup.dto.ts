import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  /**
   * Password must be at least 8 characters.
   * It will be hashed with bcrypt before storage.
   */
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt max input length
  password: string;
}
