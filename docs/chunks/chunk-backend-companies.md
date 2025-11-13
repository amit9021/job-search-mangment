---
id: chunk-backend-companies
title: Backend · Companies API
module: backend-companies
generated_at: 2025-11-13T11:35:30.183Z
tags: ["api","service"]
source_paths: ["backend/src/modules/companies/companies.controller.ts","backend/src/modules/companies/companies.service.ts"]
exports: ["CompaniesController","CompaniesService"]
imports: ["../../common/dto/id-param.dto","../../prisma/prisma.service","./companies.service","./dto","@nestjs/common"]
tokens_est: 433
---

### Summary
- Provides create/list/detail/update routes under /companies for deduped company records.
- Service enforces case-insensitive uniqueness and returns relation counts.

### Key API / Logic

### Operational Notes

**Invariants**
- Names are deduplicated case-insensitively before insert to avoid duplicates.
- Each update ensures the company exists first to avoid silent creates.

**Failure modes**
- Unknown company IDs surface as NotFoundException.
- High-volume queries rely on DB indexes; missing indexes will regress list performance.

**Extension tips**
- Add new metadata fields by extending the Prisma model and DTOs together.
- When exposing derived stats, prefer Prisma projections over computed loops.

#### backend/src/modules/companies/companies.controller.ts

```ts
export class CompaniesController {
  @Post()
    async create(@Body() body: CreateCompanyDto) {
      return this.companiesService.create(body);
    }

  @Get()
    async list(@Query('query') query?: string) {
      return this.companiesService.list(query);
    }

  @Get(':id')
    async findById(@Param() params: IdParamDto) {
      return this.companiesService.findById(params.id);
    }

  @Patch(':id')
    async update(@Param() params: IdParamDto, @Body() body: UpdateCompanyDto) {
      return this.companiesService.update(params.id, body);
    }
}
```

#### backend/src/modules/companies/companies.service.ts

```ts
export class CompaniesService {
  async create(data: { name: string; domain?: string; linkedinUrl?: string }) {
      // Check if company with this name already exists
      const existing = await this.prisma.company.findFirst({
        where: { name: { equals: data.name, mode: 'insensitive' } }
      });
  
      if (existing) {
        return existing;
      }
  
      return this.prisma.company.create({
        data: {
          name: data.name,
          domain: data.domain || null,
          linkedinUrl: data.linkedinUrl || null
        }
      });
    }

  async list(query?: string) {
      return this.prisma.company.findMany({
        where: query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { domain: { contains: query, mode: 'insensitive' } }
              ]
            }
          : undefined,
        orderBy: { name: 'asc' },
        take: 50
      });
    }

  async findById(id: string) {
      const company = await this.prisma.company.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              contacts: true,
              jobs: true
            }
          }
        }
      });
  
      if (!company) {
        throw new NotFoundException(`Company with ID ${id} not found`);
      }
  
      return company;
    }

  async update(id: string, data: { name?: string; domain?: string; linkedinUrl?: string }) {
      await this.findById(id); // Ensure exists
  
      return this.prisma.company.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.domain !== undefined && { domain: data.domain || null }),
          ...(data.linkedinUrl !== undefined && { linkedinUrl: data.linkedinUrl || null })
        }
      });
    }

  async findOrCreate(name: string) {
      const existing = await this.prisma.company.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } }
      });
  
      if (existing) {
        return existing;
      }
  
      return this.create({ name });
    }
}
```

### Related
- [chunk-backend-contacts](./chunk-backend-contacts.md)
- [chunk-backend-jobs](./chunk-backend-jobs.md)
