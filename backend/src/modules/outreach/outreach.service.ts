import { Injectable, NotFoundException } from '@nestjs/common';
import { OutreachOutcome } from '@prisma/client';
import dayjs from '../../utils/dayjs';
import { PrismaService } from '../../prisma/prisma.service';
import { FollowupsService } from '../followups/followups.service';

type OutreachInput = {
  contactId?: string;
  channel: string;
  messageType: string;
  personalizationScore: number;
  outcome?: OutreachOutcome;
  content?: string | null;
  createFollowUp?: boolean;
  followUpNote?: string;
};

@Injectable()
export class OutreachService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly followupsService: FollowupsService
  ) {}

  async createJobOutreach(jobId: string, payload: OutreachInput) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const outreach = await this.prisma.outreach.create({
      data: {
        jobId,
        contactId: payload.contactId ?? null,
        channel: payload.channel,
        messageType: payload.messageType,
        personalizationScore: payload.personalizationScore,
        outcome: payload.outcome ?? OutreachOutcome.NONE,
        content: payload.content ?? null
      },
      include: { contact: true }
    });

    if (payload.createFollowUp !== false) {
      await this.followupsService.createFollowup({
        jobId,
        contactId: payload.contactId,
        attemptNo: 1,
        dueAt: dayjs(outreach.sentAt).add(3, 'day').toDate(),
        note: payload.followUpNote
      });
    }

    await this.handleOutcomeEffects(outreach.contactId, payload.outcome);
    return outreach;
  }

  async createContactOutreach(contactId: string, payload: OutreachInput) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const outreach = await this.prisma.outreach.create({
      data: {
        contactId,
        jobId: null,
        channel: payload.channel,
        messageType: payload.messageType,
        personalizationScore: payload.personalizationScore,
        outcome: payload.outcome ?? OutreachOutcome.NONE,
        content: payload.content ?? null
      }
    });

    if (payload.createFollowUp !== false) {
      await this.followupsService.createFollowup({
        contactId,
        attemptNo: 1,
        dueAt: dayjs(outreach.sentAt).add(3, 'day').toDate(),
        note: payload.followUpNote
      });
    }

    await this.handleOutcomeEffects(contactId, payload.outcome);
    return outreach;
  }

  private async handleOutcomeEffects(contactId?: string | null, outcome?: OutreachOutcome) {
    if (!contactId || outcome !== OutreachOutcome.POSITIVE) {
      return;
    }
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      return;
    }
    if (contact.strength === 'WEAK') {
      await this.prisma.contact.update({
        where: { id: contactId },
        data: { strength: 'MEDIUM' }
      });
    }
  }

  async list(filter: { jobId?: string; contactId?: string }) {
    return this.prisma.outreach.findMany({
      where: {
        ...(filter.jobId ? { jobId: filter.jobId } : {}),
        ...(filter.contactId ? { contactId: filter.contactId } : {})
      },
      orderBy: { sentAt: 'desc' },
      include: { job: true, contact: true }
    });
  }
}
