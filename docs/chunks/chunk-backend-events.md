---
id: chunk-backend-events
title: Backend · Events API
module: backend-events
generated_at: 2025-11-09T09:43:23.366Z
tags: ["api","service"]
source_paths: ["backend/src/modules/events/events.controller.ts","backend/src/modules/events/events.service.ts"]
exports: ["EventsController","EventsService"]
imports: ["../../common/dto/id-param.dto","../../prisma/prisma.service","../../utils/dayjs","../followups/followups.service","./dto","./events.service","@nestjs/common","@prisma/client"]
tokens_est: 451
---

### Summary
- CRUD endpoints for networking events plus contact follow-up links.

### Key API / Logic

### Operational Notes

**Invariants**
- Event status limited to PLANNED/ATTENDED; update enums everywhere before adding more.
- Follow-up due dates stay optional; null values signal no obligation.

**Failure modes**
- Removing events cascades to EventContact; ensure Prisma relations stay consistent.
- Invalid dates or negative conversation targets fail DTO validation.

**Extension tips**
- Add location/timezone data carefully—frontend expects ISO strings.
- Bulk import should dedupe contacts via ContactsService.

#### backend/src/modules/events/events.controller.ts

```ts
export class EventsController {
  @Get()
    async list() {
      return this.eventsService.list();
    }

  @Post()
    async create(@Body() body: CreateEventDto) {
      return this.eventsService.create(body);
    }

  @Patch(':id')
    async update(@Param() params: IdParamDto, @Body() body: UpdateEventDto) {
      return this.eventsService.update(params.id, body);
    }

  @Post(':id/attend')
    async attend(@Param() params: IdParamDto, @Body() body: AttendEventDto) {
      return this.eventsService.markAttended(params.id, body);
    }

  @Post(':id/contacts')
    async addContact(@Param() params: IdParamDto, @Body() body: AddEventContactDto) {
      return this.eventsService.addContact(params.id, body.contactId, body.followupDueAt, body.note);
    }
}
```

#### backend/src/modules/events/events.service.ts

```ts
export class EventsService {
  async list() {
      return this.prisma.event.findMany({
        orderBy: { date: 'asc' },
        include: {
          eventContacts: {
            include: { contact: true }
          }
        }
      });
    }

  async create(params: CreateEventParams) {
      return this.prisma.event.create({
        data: {
          name: params.name,
          date: new Date(params.date),
          location: params.location ?? null,
          topic: params.topic ?? null,
          status: params.status ?? EventStatus.PLANNED,
          targetsMinConversations: params.targetsMinConversations ?? null
        }
      });
    }

  async update(id: string, params: UpdateEventParams) {
      const data: Record<string, unknown> = {};
      if (params.name !== undefined) data.name = params.name;
      if (params.date !== undefined) data.date = new Date(params.date);
      if (params.location !== undefined) data.location = params.location;
      if (params.topic !== undefined) data.topic = params.topic;
      if (params.status !== undefined) data.status = params.status;
      if (params.targetsMinConversations !== undefined)
        data.targetsMinConversations = params.targetsMinConversations;
  
      return this.prisma.event.update({
        where: { id },
        data
      });
    }

  async addContact(eventId: string, contactId: string, followupDueAt?: string, note?: string) {
      const event = await this.prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        throw new NotFoundException('Event not found');
      }
      await this.prisma.contact.findUniqueOrThrow({ where: { id: contactId } });
  
      const eventContact = await this.prisma.eventContact.create({
        data: {
          eventId,
          contactId,
          followupDueAt: followupDueAt ? new Date(followupDueAt) : null
        },
        include: { contact: true }
      });
  
      if (followupDueAt) {
        await this.followupsService.createFollowup({
          contactId,
          attemptNo: 1,
          dueAt: new Date(followupDueAt),
          note
        });
      }
  
      return eventContact;
    }

  async markAttended(eventId: string, params: AttendEventParams) {
      const event = await this.prisma.event.update({
        where: { id: eventId },
        data: { status: EventStatus.ATTENDED }
      });
  
      for (const contact of params.contacts ?? []) {
        const due = contact.followupDueAt
          ? new Date(contact.followupDueAt)
          : dayjs(event.date).add(2, 'day').toDate();
        await this.addContact(eventId, contact.contactId, due.toISOString(), contact.note);
      }
  
      return event;
    }
}
```

### Related
- [chunk-backend-contacts](./chunk-backend-contacts.md)
