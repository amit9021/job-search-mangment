import { Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import dayjs from '../../utils/dayjs';
import { FollowupsService } from '../followups/followups.service';

type CreateEventParams = {
  name: string;
  date: string;
  location?: string;
  topic?: string;
  status?: EventStatus;
  targetsMinConversations?: number;
};

type UpdateEventParams = Partial<CreateEventParams>;

type AttendEventParams = {
  contacts: Array<{
    contactId: string;
    followupDueAt?: string;
    note?: string;
  }>;
};

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly followupsService: FollowupsService
  ) {}

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
