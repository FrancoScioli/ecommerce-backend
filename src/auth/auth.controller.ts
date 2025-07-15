import { Controller, Post, Body, UnauthorizedException, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { Role } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import axios from 'axios';
import { CreateAdminDto } from './dto/create-admin-dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('create-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createAdmin(@Body() dto: CreateAdminDto) {
    const { recaptchaToken, ...userDto } = dto;

    const isValid = await this.verifyRecaptcha(recaptchaToken);
    if (!isValid) throw new BadRequestException("Falló la verificación reCAPTCHA");

    return this.authService.register({
      ...userDto,
      role: Role.ADMIN,
    });
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const { recaptcha, ...userDto } = dto;

    const isValid = await this.verifyRecaptcha(recaptcha);
    if (!isValid) throw new BadRequestException("Falló la verificación reCAPTCHA");

    return this.authService.register({
      ...userDto,
      role: Role.USER,
      firstName: userDto.firstName,
      lastName: userDto.lastName,
    });
  }


  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    const tokens = await this.authService.refreshToken(refreshToken);
    if (!tokens) throw new UnauthorizedException('Refresh token inválido');
    return tokens;
  }

  private async verifyRecaptcha(token: string): Promise<boolean> {
    const secret = process.env.RECAPTCHA_SECRET_KEY!;
    try {
      const res = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`
      );
      return res.data.success;
    } catch (err) {
      console.error("Error verificando reCAPTCHA:", err);
      return false;
    }
  }

}
