import { Injectable } from '@nestjs/common';
import dayjs from '../../utils/dayjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KpiService {
  constructor(private readonly prisma: PrismaService) {}

  async getToday() {
    const start = dayjs().startOf('day').toDate();
    const end = dayjs().endOf('day').toDate();

    const [cvSentToday, outreachToday, followupsDue, seniorReviewsThisWeek, heatBreakdown] = await Promise.all([
      this.prisma.jobApplication.count({
        where: {
          dateSent: { gte: start, lte: end }
        }
      }),
      this.prisma.outreach.count({
        where: {
          sentAt: { gte: start, lte: end }
        }
      }),
      this.prisma.followUp.count({
        where: {
          dueAt: { gte: start, lte: end },
          sentAt: null
        }
      }),
      this.countSeniorReviewsThisWeek(),
      this.prisma.job.groupBy({
        by: ['heat'],
        _count: { _all: true }
      })
    ]);

    return {
      cvSentToday,
      cvTarget: 5,
      outreachToday,
      outreachTarget: 5,
      followupsDue,
      seniorReviewsThisWeek,
      heatBreakdown: [0, 1, 2, 3].map((heat) => ({
        heat,
        count: heatBreakdown.find((item) => item.heat === heat)?._count._all ?? 0
      }))
    };
  }

  async getWeek() {
    const start = dayjs().startOf('week').toDate();
    const end = dayjs().endOf('week').toDate();

    const [
      cvSent,
      outreach,
      followupsSent,
      eventsAttendedLegacy,
      boostTasksDoneLegacy,
      eventsAttendedGrow,
      boostTasksCompletedGrow
    ] = await Promise.all([
        this.prisma.jobApplication.count({
          where: { dateSent: { gte: start, lte: end } }
        }),
        this.prisma.outreach.count({
          where: { sentAt: { gte: start, lte: end } }
      }),
      this.prisma.followUp.count({
        where: { sentAt: { gte: start, lte: end } }
        }),
        this.prisma.event.count({
          where: { status: 'ATTENDED', date: { gte: start, lte: end } }
        }),
        this.prisma.boostTask.count({
          where: { doneAt: { gte: start, lte: end } }
        }),
      this.prisma.growthEvent.count({
        where: { attended: true, date: { gte: start, lte: end } }
      }),
      this.prisma.growthBoostTask.count({
        where: {
          status: 'completed',
          completedAt: { gte: start, lte: end }
        }
      })
    ]);

    return {
      cvSent,
      outreach,
      followupsSent,
      eventsAttended: eventsAttendedLegacy + eventsAttendedGrow,
      boostTasksDone: boostTasksDoneLegacy + boostTasksCompletedGrow
    };
  }

  private async countSeniorReviewsThisWeek() {
    const start = dayjs().startOf('week').toDate();
    const end = dayjs().endOf('week').toDate();
    const [legacy, growth] = await Promise.all([
      this.prisma.codeReview.count({
        where: {
          reviewedAt: { gte: start, lte: end }
        }
      }),
      this.prisma.growthReview.count({
        where: {
          reviewedAt: { gte: start, lte: end }
        }
      })
    ]);
    return legacy + growth;
  }
}
