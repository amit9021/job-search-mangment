---
id: chunk-backend-contacts
title: Backend · Contacts API
module: backend-contacts
generated_at: 2025-11-09T08:03:21.008Z
tags: ["api","service","db"]
source_paths: ["backend/src/modules/contacts/contacts.controller.ts","backend/src/modules/contacts/contacts.service.ts"]
exports: ["ContactsController","ContactsService"]
imports: ["../../common/dto/id-param.dto","../../prisma/prisma.service","../companies/companies.service","../outreach/outreach.service","../referrals/referrals.service","../reviews/reviews.service","./contacts.service","./dto","@nestjs/common","@prisma/client","date-fns"]
tokens_est: 749
---

### Summary
- GET /contacts supports filters (query, strength, tags, lastTouch) with pagination.
- POST/PATCH routes manage contact metadata plus company linkage.
- Service augments contacts with linked jobs, outreach, and follow-up snapshots.

### Key API / Logic

### Operational Notes

**Invariants**
- Contacts default to non-archived view; includeArchived must be explicitly requested.
- Engagement scores derive from outreach/followup joins and require recent activity data.

**Failure modes**
- Missing company references trigger NotFoundException before writes.
- Large text searches may need additional DB indexes if new fields are added.

**Extension tips**
- Add new filters by updating the list query builder + DTO schema.
- Keep computed engagement helpers in sync when adding new touch types.

#### backend/src/modules/contacts/contacts.controller.ts

```ts
export class ContactsController {
  @Get()
    async list(@Query() query: ListContactsQueryDto) {
      return this.contactsService.list({
        query: query.query,
        strength: query.strength,
        companyId: query.companyId,
        includeArchived: query.includeArchived,
        page: query.page,
        pageSize: query.pageSize
      });
    }

  @Get('stars')
    async stars() {
      return this.contactsService.listNetworkStars();
    }

  @Get(':id')
    async getById(@Param() params: IdParamDto) {
      return this.contactsService.getById(params.id);
    }

  @Get(':id/heat')
    async heat(@Param() params: IdParamDto) {
      return this.contactsService.getEngagementSummary(params.id);
    }

  @Post()
    async create(@Body() body: CreateContactDto) {
      return this.contactsService.create(body);
    }

  @Patch(':id')
    async update(@Param() params: IdParamDto, @Body() body: UpdateContactDto) {
      return this.contactsService.update(params.id, body);
    }

  @Delete(':id')
    async delete(@Param() params: IdParamDto, @Query('hard') hard?: string) {
      const hardDelete =
        typeof hard === 'string' ? ['true', '1', 'yes', 'on'].includes(hard.toLowerCase()) : false;
      return this.contactsService.delete(params.id, { hard: hardDelete });
    }

  @Post(':id/outreach')
    async outreach(@Param() params: IdParamDto, @Body() body: CreateContactOutreachDto) {
      return this.outreachService.createContactOutreach(params.id, body);
    }

  @Post(':id/referrals')
    async referral(@Param() params: IdParamDto, @Body() body: CreateReferralDto) {
      return this.referralsService.createForContact(params.id, body);
    }

  @Post(':id/reviews')
    async review(@Param() params: IdParamDto, @Body() body: CreateReviewDto) {
      return this.reviewsService.createForContact(params.id, body);
    }
}
```

#### backend/src/modules/contacts/contacts.service.ts

```ts
export class ContactsService {
  async list(params?: {
      query?: string;
      strength?: ContactStrength;
      companyId?: string;
      includeArchived?: boolean;
      page?: number;
      pageSize?: number;
      tags?: string[];
      lastTouch?: '7d' | '30d' | 'stale' | 'never';
    }) {
      const {
        query,
        strength,
        companyId,
        includeArchived = false,
        page = 1,
        pageSize = 50,
        tags,
        lastTouch
      } = params || {};
  
      const where: any = {
        ...(includeArchived ? {} : { archived: false })
      };
  
      if (strength) {
        where.strength = strength;
      }
  
      if (companyId) {
        where.companyId = companyId;
      }
  
      if (tags && tags.length > 0) {
        where.tags = { hasEvery: tags };
      }
  
      if (query) {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { role: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { linkedinUrl: { contains: query, mode: 'insensitive' } },
          { githubUrl: { contains: query, mode: 'insensitive' } }
        ];
      }
  
      const contacts = await this.prisma.contact.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
     
    /* ... truncated ... */

  async create(data: {
      name: string;
      companyId?: string;
      companyName?: string;
      role?: string;
      email?: string;
      phone?: string;
      linkedinUrl?: string;
      githubUrl?: string;
      location?: string;
      tags?: string[];
      notes?: string;
      strength?: ContactStrength;
    }) {
      // Auto-create company if companyName provided
      let finalCompanyId = data.companyId;
      if (data.companyName && !finalCompanyId) {
        const company = await this.companiesService.findOrCreate(data.companyName);
        finalCompanyId = company.id;
      }
  
      return this.prisma.contact.create({
        data: {
          name: data.name,
          companyId: finalCompanyId ?? null,
          role: data.role ?? null,
          email: data.email || null,
          phone: data.phone || null,
          linkedinUrl: data.linkedinUrl || null,
          githubUrl: data.githubUrl || null,
          location: data.location ?? null,
          tags: data.tags ?? [],
          notes: data.notes ?? null,
          strength: data.strength ?? ContactStrength.WEAK,
          archived: false
        },
        include: {
          company: true
        }
      });
    }

  async getById(contactId: string) {
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        include: {
          company: true,
          referrals: {
            orderBy: { at: 'desc' },
            take: 20,
            include: { job: true }
          },
          outreaches: {
            orderBy: { sentAt: 'desc' },
            take: 20,
            include: {
              job: {
                select: {
                  id: true,
                  company: true,
                  role: true,
                  stage: true
                }
              }
            }
          },
          reviews: {
            orderBy: { requestedAt: 'desc' },
            take: 20,
            include: { project: true }
          },
          followups: {
            orderBy: { dueAt: 'desc' },
            include: {
              job: {
                select: {
                  id: true,
                  company: true,
                  role: true,
                  stage: true
                }
              }
            }
          }
        }
      });
      if (!contact) {
        throw new NotFoundException('Contact not found');
      }
      if (contact.archived) {
        throw new NotFoundException('Contact not found');
      }
  
      // Build unified timeline
      const timel
    /* .
```

### Related
- [chunk-backend-companies](./chunk-backend-companies.md)
- [chunk-backend-jobs](./chunk-backend-jobs.md)
