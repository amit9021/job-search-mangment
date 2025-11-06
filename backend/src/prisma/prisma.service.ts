import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const ensureDatabaseUrl = () => {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
    return;
  }

  const normalizedEnv = (process.env.NODE_ENV ?? 'development').toLowerCase();
  const envSpecificUrl =
    (normalizedEnv === 'production' && process.env.DATABASE_URL_PROD) ||
    (normalizedEnv === 'test' && (process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL_DEV)) ||
    process.env.DATABASE_URL_DEV;

  if (envSpecificUrl && envSpecificUrl.trim() !== '') {
    process.env.DATABASE_URL = envSpecificUrl;
  }
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    ensureDatabaseUrl();
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  enableShutdownHooks(app: INestApplication) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.$on as any)('beforeExit', async () => {
      await app.close();
    });
  }
}
