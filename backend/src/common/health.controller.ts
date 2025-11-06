import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Public } from './decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  @Public()
  @Get()
  health() {
    const databaseUrl = this.configService.get<string>('DATABASE_URL') ?? process.env.DATABASE_URL ?? '';
    const database = extractDatabaseDetails(databaseUrl);

    return {
      status: 'ok',
      environment: process.env.NODE_ENV ?? 'development',
      database
    };
  }
}

const extractDatabaseDetails = (databaseUrl: string) => {
  if (!databaseUrl) {
    return null;
  }

  try {
    const parsed = new URL(databaseUrl);
    return {
      name: parsed.pathname.replace(/^\//, ''),
      host: parsed.hostname
    };
  } catch {
    return null;
  }
};
