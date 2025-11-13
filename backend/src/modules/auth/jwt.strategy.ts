import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthProfile } from './auth.service';

type JwtPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'change_me')
    });
  }

  async validate(payload: JwtPayload): Promise<AuthProfile | null> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt
    };
  }
}
