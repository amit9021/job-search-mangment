import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Public } from '../../../common/decorators/public.decorator';

@Controller('auth/oauth')
@Public()
export class OAuthController {
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = (this.configService.get<string>('AUTH_OAUTH_ENABLED') ?? 'false') === 'true';
  }

  @Get(':provider')
  authorize(@Param('provider') provider: string) {
    this.ensureEnabled(provider);
  }

  @Get(':provider/callback')
  callback(@Param('provider') provider: string, @Query('code') code?: string) {
    this.ensureEnabled(provider);
    if (!code) {
      throw new NotFoundException('OAuth code missing.');
    }
  }

  private ensureEnabled(provider: string) {
    if (!this.enabled) {
      throw new NotFoundException('OAuth providers are disabled.');
    }
    throw new NotFoundException(`OAuth provider "${provider}" is not available yet.`);
  }
}
