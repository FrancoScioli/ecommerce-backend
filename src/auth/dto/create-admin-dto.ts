import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  recaptchaToken: string;

  @IsString()
  firstName: string

  @IsString()
  lastName: string
}
