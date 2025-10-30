import { Injectable, NotFoundException } from '@nestjs/common';
import dayjs from '../../utils/dayjs';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type FollowupContext = {
  jobId?: string;
  contactId?: string;
  note?: string | null;
};

@Injectable()
export class FollowupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  async getDue(filter: 'today' | 'overdue' | 'upcoming' = 'today') {
    const now = dayjs();
    const startOfDay = now.startOf('day').toDate();
    const endOfDay = now.endOf('day').toDate();
    let where;
    switch (filter) {
      case 'overdue':
        where = { dueAt: { lt: startOfDay }, sentAt: null };
        break;
      case 'upcoming':
        where = { dueAt: { gt: endOfDay }, sentAt: null };
        break;
      default:
        where = { dueAt: { gte: startOfDay, lte: endOfDay }, sentAt: null };
    }
    return this.prisma.followUp.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      include: { job: true, contact: true }
    });
  }

  async scheduleInitialFollowup(context: FollowupContext) {
    return this.createFollowup({
      ...context,
      attemptNo: 1,
      dueAt: dayjs().add(3, 'day').toDate()
    });
  }

  async createFollowup(params: FollowupContext & { attemptNo: 1 | 2; dueAt: Date }) {
    return this.prisma.followUp.create({
      data: {
        jobId: params.jobId ?? null,
        contactId: params.contactId ?? null,
        note: params.note ?? null,
        attemptNo: params.attemptNo,
        dueAt: params.dueAt
      }
    });
  }

  async markSent(id: string, note?: string) {
    const followup = await this.prisma.followUp.findUnique({ where: { id } });
    if (!followup) {
      throw new NotFoundException('Follow-up not found');
    }

    const updated = await this.prisma.followUp.update({
      where: { id },
      data: { sentAt: new Date(), note: note ?? followup.note }
    });

    if (followup.attemptNo === 1) {
      await this.createFollowup({
        jobId: followup.jobId ?? undefined,
        contactId: followup.contactId ?? undefined,
        attemptNo: 2,
        dueAt: dayjs().add(3, 'day').toDate()
      });
    } else if (followup.attemptNo === 2) {
      // Schedule dormancy check notification in 7 days
      await this.notificationsService.queueDormantCandidateCheck({
        jobId: followup.jobId ?? undefined,
        contactId: followup.contactId ?? undefined,
        dueAt: dayjs().add(7, 'day').toDate()
      });
    }

    return updated;
  }

  async markDormantForJob(jobId: string) {
    await this.prisma.followUp.updateMany({
      where: { jobId, sentAt: null },
      data: { note: 'Marked dormant' }
    });
  }
}
