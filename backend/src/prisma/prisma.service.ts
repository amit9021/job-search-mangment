import {
  INestApplication,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

import { RequestContextService } from '../common/context/request-context.service';

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
  private readonly multiTenantModels = new Set([
    'Company',
    'Job',
    'Contact',
    'Task',
    'GrowthReview',
    'GrowthEvent',
    'GrowthBoostTask',
    'ProjectHighlight'
  ]);

  constructor(private readonly requestContext: RequestContextService) {
    ensureDatabaseUrl();
    super();
    (this as PrismaClient & { $use?: (fn: Prisma.Middleware) => void }).$use?.(
      this.enforceUserIsolation
    );
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

  private enforceUserIsolation: Prisma.Middleware = async (params, next) => {
    if (!params.model || !this.multiTenantModels.has(params.model)) {
      return next(params);
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      return next(params);
    }
    params.args = (params.args ?? {}) as Record<string, unknown>;

    switch (params.action) {
      case 'findMany':
      case 'updateMany':
      case 'deleteMany':
      case 'count':
      case 'aggregate':
        params.args.where = this.scopeWhere(
          (params.args.where as Record<string, unknown> | undefined) ?? undefined,
          userId
        );
        break;
      case 'findFirst':
        params.args.where = this.scopeWhere(
          (params.args.where as Record<string, unknown> | undefined) ?? undefined,
          userId
        );
        break;
      case 'findUnique':
        params.action = 'findFirst';
        params.args.where = this.scopeWhere(
          (params.args.where as Record<string, unknown> | undefined) ?? undefined,
          userId
        );
        break;
      case 'create':
        params.args.data = this.ensureUserId(
          params.args.data as Record<string, unknown>,
          userId
        );
        break;
      case 'createMany':
        params.args.data = (params.args.data as Record<string, unknown>[]).map((entry) =>
          this.ensureUserId(entry, userId)
        );
        break;
      case 'update':
      case 'delete':
        await this.assertOwnership(
          params.model,
          params.args.where as Record<string, unknown>,
          userId
        );
        break;
      case 'upsert':
        await this.assertOwnership(
          params.model,
          params.args.where as Record<string, unknown> | undefined,
          userId,
          true
        );
        params.args.create = this.ensureUserId(
          params.args.create as Record<string, unknown>,
          userId
        );
        params.args.update = this.ensureUserId(
          params.args.update as Record<string, unknown>,
          userId
        );
        break;
      default:
        break;
    }

    return next(params);
  };

  private scopeWhere(where: Record<string, unknown> | undefined, userId: string) {
    if (!where) {
      return { userId };
    }
    if (Object.prototype.hasOwnProperty.call(where, 'userId')) {
      return where;
    }
    return { ...where, userId };
  }

  private ensureUserId<T extends Record<string, unknown>>(data: T, userId: string): T {
    if (data.userId) {
      return data;
    }
    return { ...data, userId } as T;
  }

  private async assertOwnership(
    model: string,
    whereInput: Record<string, unknown> | undefined,
    userId: string,
    allowMissing = false
  ) {
    const where = whereInput ?? {};
    const delegate = (this as unknown as Record<string, unknown>)[model.toLowerCase()] as
      | { findFirst?: (args: unknown) => Promise<unknown> }
      | undefined;
    if (!delegate || typeof (delegate as Record<string, unknown>).findFirst !== 'function') {
      return;
    }

    const scopedWhere = this.scopeWhere(where, userId);
    const existing = await (delegate as { findFirst: (args: unknown) => Promise<unknown> }).findFirst(
      { where: scopedWhere }
    );

    if (!existing) {
      if (allowMissing) {
        const conflict = await (delegate as {
          findFirst: (args: unknown) => Promise<unknown>;
        }).findFirst({ where });
        if (conflict) {
          throw new NotFoundException(`${model} not accessible for current user`);
        }
        return;
      }
      throw new NotFoundException(`${model} not accessible for current user`);
    }
  }
}
