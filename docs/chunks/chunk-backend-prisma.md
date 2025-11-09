---
id: chunk-backend-prisma
title: Backend · Prisma Service & Schema
module: backend-prisma
generated_at: 2025-11-09T08:03:21.008Z
tags: ["db"]
source_paths: ["backend/src/prisma/prisma.service.ts","prisma/schema.prisma"]
exports: ["PrismaService"]
imports: ["../common/context/request-context.service","@nestjs/common","@prisma/client"]
tokens_est: 157
---

### Summary
- PrismaService picks DATABASE_URL based on NODE_ENV and instantiates the client.
- schema.prisma defines jobs/contacts/outreach/followups/etc using cuid IDs.

### Key API / Logic

### Operational Notes

**Invariants**
- DATABASE_URL is derived from NODE_ENV-specific envs when available.
- All relations use cuid IDs; cascading deletes require manual implementation.

**Failure modes**
- Missing DATABASE_URL_* envs cause runtime errors during Prisma bootstrap.
- Binary target mismatch requires regenerating Prisma client.

**Extension tips**
- Update schema.prisma + run prisma migrate before changing services.
- Prefer relation IDs over denormalized fields to keep heat stats accurate.

#### backend/src/prisma/prisma.service.ts

```ts
export class PrismaService {
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
```

#### prisma/schema.prisma

```ts

```

### Related
- [chunk-backend-jobs](./chunk-backend-jobs.md)
- [chunk-backend-contacts](./chunk-backend-contacts.md)
- [chunk-backend-dashboard](./chunk-backend-dashboard.md)
