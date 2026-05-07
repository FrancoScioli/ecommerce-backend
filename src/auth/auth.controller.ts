import { Controller, Post, Get, Patch, Body, UnauthorizedException, UseGuards, BadRequestException, Request } from '@nestjs/common';
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


  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req: any) {
    return this.authService.getMe(req.user.userId ?? req.user.sub)
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@Request() req: any, @Body() body: { firstName?: string; lastName?: string; phone?: string; password?: string }) {
    return this.authService.updateMe(req.user.userId ?? req.user.sub, body)
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
