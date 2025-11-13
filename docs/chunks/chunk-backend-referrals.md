---
id: chunk-backend-referrals
title: Backend · Referrals API
module: backend-referrals
generated_at: 2025-11-13T11:35:30.183Z
tags: ["api","service"]
source_paths: ["backend/src/modules/referrals/referrals.controller.ts","backend/src/modules/referrals/referrals.service.ts"]
exports: ["ReferralsController","ReferralsService"]
imports: ["../../prisma/prisma.service","../jobs/jobs.service","./dto/create-referral.dto","./referrals.service","@nestjs/common","@prisma/client"]
tokens_est: 257
---

### Summary
- Captures referral attempts/notes and ties them to contacts + jobs.

### Key API / Logic

### Operational Notes

**Invariants**
- ReferralKind enum drives both backend validation and React display.
- Timestamps default to now; clients rarely send explicit values.

**Failure modes**
- Invalid job/contact IDs raise NotFoundException.
- Missing referral kind/notes fail Zod validation.

**Extension tips**
- Use Prisma include to pull related job/contact details when adding new endpoints.
- Add referral scoring inside service, not the controller.

#### backend/src/modules/referrals/referrals.controller.ts

```ts
export class ReferralsController {
  @Get()
    async list() {
      return this.referralsService.list();
    }

  @Post()
    async create(@Body() body: CreateReferralBodyDto) {
      const { contactId, ...params } = body;
      return this.referralsService.createForContact(contactId, params);
    }
}
```

#### backend/src/modules/referrals/referrals.service.ts

```ts
export class ReferralsService {
  async list() {
      return this.prisma.referral.findMany({
        orderBy: { at: 'desc' },
        include: { contact: true, job: true }
      });
    }

  async createForContact(contactId: string, params: CreateReferralParams) {
      const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
      if (!contact) {
        throw new NotFoundException('Contact not found');
      }
  
      const referral = await this.prisma.referral.create({
        data: {
          contactId,
          jobId: params.jobId ?? null,
          kind: params.kind,
          note: params.note ?? null
        },
        include: { job: true, contact: true }
      });
  
      // Upgrade strength to STRONG
      if (contact.strength !== 'STRONG') {
        await this.prisma.contact.update({
          where: { id: contactId },
          data: { strength: 'STRONG' }
        });
      }
  
      if (params.jobId) {
        await this.jobsService.recalculateHeat(params.jobId);
      }
  
      return referral;
    }
}
```

### Related
- [chunk-backend-contacts](./chunk-backend-contacts.md)
- [chunk-backend-jobs](./chunk-backend-jobs.md)
