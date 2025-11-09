import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async validateUser(username: string, password: string) {
    const adminUsername = (
      this.configService.get<string>('ADMIN_USERNAME') ??
      process.env.ADMIN_USERNAME ??
      'admin'
    ).trim();
    const adminPassword = (
      this.configService.get<string>('ADMIN_PASSWORD') ??
      process.env.ADMIN_PASSWORD ??
      'change_me'
    ).trim();

    if (username.trim() !== adminUsername || password.trim() !== adminPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure backing record exists for analytics/auditing purposes
    const user = await this.prisma.user.upsert({
      where: { username: adminUsername },
      update: { passwordHash: 'env_managed' },
      create: {
        username: adminUsername,
        passwordHash: 'env_managed'
      }
    });

    return user;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    await this.claimOrphanedRecords(user.id);
    const payload = { sub: user.id, username: user.username };
    const token = await this.jwtService.signAsync(payload);
    return {
      token,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '12h'),
      user: {
        id: user.id,
        username: user.username
      }
    };
  }

  private async claimOrphanedRecords(userId: string) {
    await Promise.all([
      this.prisma.company.updateMany({ where: { userId: null }, data: { userId } }),
      this.prisma.job.updateMany({ where: { userId: null }, data: { userId } }),
      this.prisma.contact.updateMany({ where: { userId: null }, data: { userId } }),
      this.prisma.task.updateMany({ where: { userId: null }, data: { userId } }),
      this.prisma.growthReview.updateMany({ where: { userId: null }, data: { userId } }),
      this.prisma.growthEvent.updateMany({ where: { userId: null }, data: { userId } }),
      this.prisma.growthBoostTask.updateMany({ where: { userId: null }, data: { userId } }),
      this.prisma.projectHighlight.updateMany({ where: { userId: null }, data: { userId } })
    ]);
  }
}
