import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username }, include: { roles: true } });
    if (!user || !user.isActive) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    const payload = { sub: user.id, username: user.username };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: '7d',
    });

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      update: {
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, fullName: user.fullName },
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; username: string };
    try {
      payload = this.jwtService.verify(refreshToken, { secret: this.refreshSecret });
    } catch {
      throw new UnauthorizedException('Sesión inválida');
    }

    const record = await this.prisma.refreshToken.findUnique({ where: { userId: payload.sub } });
    if (!record || record.expiresAt <= new Date()) throw new UnauthorizedException('Sesión inválida');

    const valid = await bcrypt.compare(refreshToken, record.tokenHash);
    if (!valid) throw new UnauthorizedException('Sesión inválida');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException('Sesión inválida');
    const accessToken = this.jwtService.sign({ sub: user.id, username: user.username });
    return { accessToken, user: { id: user.id, username: user.username, fullName: user.fullName } };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, fullName: true, isActive: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Sesión inválida');
    return user;
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { success: true };
  }

  private get refreshSecret() {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET') ??
      (this.config.get<string>('NODE_ENV') === 'production' ? undefined : 'dev_refresh_secret');
    if (!secret) throw new Error('JWT_REFRESH_SECRET debe configurarse en producción');
    return secret;
  }
}
