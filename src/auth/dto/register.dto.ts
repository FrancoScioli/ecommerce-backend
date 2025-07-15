import { IsEmail, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  recaptcha: string;

  @IsPhoneNumber('AR')
  phone: string

  @IsString()
  firstName: string

  @IsString()
  lastName: string
}
