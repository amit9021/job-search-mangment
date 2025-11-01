import { Injectable, NotFoundException } from '@nestjs/common';
import { OutreachChannel, OutreachContext, OutreachOutcome } from '@prisma/client';
import dayjs from '../../utils/dayjs';
import { PrismaService } from '../../prisma/prisma.service';
import { FollowupsService } from '../followups/followups.service';

type OutreachInput = {
  contactId?: string;
  channel: OutreachChannel | string;
  messageType: string;
  personalizationScore?: number;
  outcome?: OutreachOutcome;
  content?: string | null;
  context?: OutreachContext | string;
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

    const personalizationScore =
      payload.personalizationScore !== undefined ? Math.round(payload.personalizationScore) : 70;
    const channel =
      typeof payload.channel === 'string'
        ? (payload.channel.toUpperCase() as OutreachChannel)
        : payload.channel;

    const outreach = await this.prisma.outreach.create({
      data: {
        jobId,
        contactId: payload.contactId ?? null,
        channel,
        messageType: payload.messageType,
        personalizationScore,
        outcome: payload.outcome ?? OutreachOutcome.NONE,
        content: payload.content ?? null,
        context:
          typeof payload.context === 'string'
            ? (payload.context.toUpperCase() as OutreachContext)
            : payload.context ?? OutreachContext.OTHER
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

    const personalizationScore =
      payload.personalizationScore !== undefined ? Math.round(payload.personalizationScore) : 70;
    const channel =
      typeof payload.channel === 'string'
        ? (payload.channel.toUpperCase() as OutreachChannel)
        : payload.channel;

    const outreach = await this.prisma.outreach.create({
      data: {
        contactId,
        jobId: null,
        channel,
        messageType: payload.messageType,
        personalizationScore,
        outcome: payload.outcome ?? OutreachOutcome.NONE,
        content: payload.content ?? null,
        context:
          typeof payload.context === 'string'
            ? (payload.context.toUpperCase() as OutreachContext)
            : payload.context ?? OutreachContext.OTHER
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

  async update(
    id: string,
    payload: {
      context?: OutreachContext;
      outcome?: OutreachOutcome;
      content?: string;
      messageType?: string;
      personalizationScore?: number;
    }
  ) {
    const outreach = await this.prisma.outreach.findUnique({ where: { id } });
    if (!outreach) {
      return { id, jobId: null, contactId: null };
    }

    const updateData: any = {};
    if (payload.context !== undefined) {
      updateData.context = payload.context;
    }
    if (payload.outcome !== undefined) {
      updateData.outcome = payload.outcome;
    }
    if (payload.content !== undefined) {
      updateData.content = payload.content;
    }
    if (payload.messageType !== undefined) {
      updateData.messageType = payload.messageType;
    }
    if (payload.personalizationScore !== undefined) {
      updateData.personalizationScore = Math.min(
        100,
        Math.max(0, Math.round(payload.personalizationScore))
      );
    }

    return this.prisma.outreach.update({
      where: { id },
      data: updateData,
      include: { contact: true, job: true }
    });
  }

  async delete(id: string) {
    const outreach = await this.prisma.outreach.findUnique({
      where: { id },
      select: {
        id: true,
        jobId: true,
        contactId: true
      }
    });

    if (!outreach) {
      throw new NotFoundException('Outreach not found');
    }

    await this.followupsService.cancelOpenForContext({
      jobId: outreach.jobId ?? undefined,
      contactId: outreach.contactId ?? undefined
    });

    await this.prisma.outreach.delete({ where: { id } });

    return {
      id,
      jobId: outreach.jobId ?? null,
      contactId: outreach.contactId ?? null
    };
  }
}
