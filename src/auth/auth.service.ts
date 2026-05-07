import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user-dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { email: email } });

    if (!user) {
      throw new BadRequestException('Credenciales inválidas');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new BadRequestException('Credenciales inválidas');
    }

    return this.getTokens(user.id, user.email, user.role, user.firstName, user.lastName);
  }

  private getTokens(
    userId: number,
    email: string,
    role: string,
    firstName: string,
    lastName: string,
  ): { accessToken: string; refreshToken: string; role: string } {
    const payload = {
      sub: userId,
      email,
      role,
      firstName,
      lastName,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return { accessToken, refreshToken, role };
  }

  async register(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) {
      throw new ConflictException('El usuario ya existe');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: dto.role,
        firstName: dto.firstName,
        lastName: dto.lastName,
        ...(dto.phone ? { phone: dto.phone } : {}),
      },
    });

    return this.getTokens(user.id, user.email, user.role, user.firstName, user.lastName);
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true },
    })
    if (!user) throw new UnauthorizedException('Usuario no encontrado')
    return user
  }

  async updateMe(userId: number, dto: { firstName?: string; lastName?: string; phone?: string; password?: string }) {
    const data: any = {}
    if (dto.firstName) data.firstName = dto.firstName
    if (dto.lastName) data.lastName = dto.lastName
    if (dto.phone !== undefined) data.phone = dto.phone
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true },
    })
    return user
  }

  async refreshToken(token: string | undefined) {
    if (!token) return null;

    try {
      const payload: any = this.jwtService.verify(token);
      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        firstName: payload.firstName,
        lastName: payload.lastName,
      };

      const accessToken = this.jwtService.sign(newPayload, { expiresIn: '15m' });
      const refreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

      return { accessToken, refreshToken };
    } catch {
      return null;
    }
  }
}
