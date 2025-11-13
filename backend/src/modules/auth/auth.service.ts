import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';

import { PrismaService } from '../../prisma/prisma.service';

export type AuthProfile = {
  id: string;
  email: string;
  createdAt: Date;
};

export type AuthTokens = {
  accessToken: string;
  exp: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(email: string, password: string): Promise<AuthProfile> {
    const normalizedEmail = this.normalizeEmail(email);
    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await this.hashPassword(password);
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash
      }
    });
    return this.toProfile(user);
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user.id, user.email);
  }

  logout() {
    return Promise.resolve();
  }

  toProfile(user: { id: string; email: string; createdAt: Date }): AuthProfile {
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private getJwtExpiresIn() {
    return this.configService.get<string>('JWT_EXPIRES_IN') ?? '7d';
  }

  private async hashPassword(password: string) {
    const roundsFromConfig = this.configService.get<number>('BCRYPT_ROUNDS');
    const roundsFromEnv = Number.parseInt(process.env.BCRYPT_ROUNDS ?? '', 10);
    const rounds = Number.isFinite(roundsFromConfig)
      ? (roundsFromConfig as number)
      : Number.isFinite(roundsFromEnv)
        ? roundsFromEnv
        : 12;
    const salt = await bcrypt.genSalt(rounds);
    return bcrypt.hash(password, salt);
  }

  private async issueTokens(userId: string, email: string): Promise<AuthTokens> {
    const payload = { sub: userId, email };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.getJwtExpiresIn()
    });
    const decoded = this.jwtService.decode(accessToken);
    if (!decoded || typeof decoded !== 'object' || typeof decoded.exp !== 'number') {
      throw new InternalServerErrorException('Unable to determine token expiration');
    }
    return {
      accessToken,
      exp: decoded.exp
    };
  }

}
