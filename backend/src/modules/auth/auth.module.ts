import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { OAuthController } from './oauth/oauth.controller';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET', 'change_me');
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN', '7d');
        return {
          secret,
          signOptions: { expiresIn }
        };
      }
    })
  ],
  controllers: [AuthController, OAuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RateLimitGuard,
    RateLimitService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    }
  ]
})
export class AuthModule {}
