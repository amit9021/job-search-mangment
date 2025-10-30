import { Injectable } from '@nestjs/common';
import dayjs from '../../utils/dayjs';
import { PrismaService } from '../../prisma/prisma.service';

type DormantCandidateParams = {
  jobId?: string;
  contactId?: string;
  dueAt: Date;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: 'today' | 'upcoming' | 'overdue' = 'today') {
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
    return this.prisma.notification.findMany({
      where,
      orderBy: { dueAt: 'asc' }
    });
  }

  async createNotification(kind: string, message: string, dueAt: Date) {
    return this.prisma.notification.create({
      data: { kind, message, dueAt }
    });
  }

  async markSent(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { sentAt: new Date() }
    });
  }

  async queueDormantCandidateCheck({ jobId, contactId, dueAt }: DormantCandidateParams) {
    const message = jobId
      ? `Review job ${jobId} for dormancy`
      : contactId
      ? `Review contact ${contactId} for dormancy`
      : 'Review dormant candidates';
    await this.prisma.notification.create({
      data: {
        kind: 'dormant_candidate',
        message,
        dueAt,
        jobId: jobId ?? null,
        contactId: contactId ?? null
      }
    });
  }

  async createDailyNudge(message: string, dueAt: Date) {
    await this.ensureNotification('daily_nudge', message, dueAt);
  }

  async ensureNotification(kind: string, message: string, dueAt: Date, extras?: { jobId?: string; contactId?: string }) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        kind,
        message,
        dueAt
      }
    });
    if (!existing) {
      await this.prisma.notification.create({
        data: {
          kind,
          message,
          dueAt,
          jobId: extras?.jobId ?? null,
          contactId: extras?.contactId ?? null
        }
      });
    }
  }
}
