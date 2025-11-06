import { Injectable } from '@nestjs/common';
import dayjs from '../../utils/dayjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KpiService {
  constructor(private readonly prisma: PrismaService) {}

  async getToday() {
    const start = dayjs().startOf('day').toDate();
    const end = dayjs().endOf('day').toDate();
    const archivedJobStages = ['REJECTED', 'DORMANT'] as const;

    const jobActiveFilter = {
      OR: [
        { jobId: null },
        {
          job: {
            archived: false,
            stage: { notIn: [...archivedJobStages] }
          }
        }
      ]
    };

    const contactActiveFilter = {
      OR: [{ contactId: null }, { contact: { archived: false } }]
    };

    const [cvSentToday, outreachToday, followupsDue, seniorReviewsThisWeek, heatBreakdown] = await Promise.all([
      this.prisma.jobApplication.count({
        where: {
          dateSent: { gte: start, lte: end },
          job: {
            archived: false,
            stage: { notIn: [...archivedJobStages] }
          }
        }
      }),
      this.prisma.outreach.count({
        where: {
          sentAt: { gte: start, lte: end },
          ...jobActiveFilter,
          OR: [...contactActiveFilter.OR]
        }
      }),
      this.prisma.followUp.count({
        where: {
          dueAt: { gte: start, lte: end },
          sentAt: null,
          ...jobActiveFilter,
          OR: [...contactActiveFilter.OR]
        }
      }),
      this.countSeniorReviewsThisWeek(),
      this.prisma.job.groupBy({
        by: ['heat'],
        where: {
          archived: false,
          stage: { notIn: [...archivedJobStages] }
        },
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
        count: (heatBreakdown.find((item) => item.heat === heat)?._count as { _all: number } | undefined)?._all ?? 0
      }))
    };
  }

  async getWeek() {
    const start = dayjs().startOf('week').toDate();
    const end = dayjs().endOf('week').toDate();
    const archivedJobStages = ['REJECTED', 'DORMANT'] as const;

    const jobActiveFilter = {
      OR: [
        { jobId: null },
        {
          job: {
            archived: false,
            stage: { notIn: [...archivedJobStages] }
          }
        }
      ]
    };

    const contactActiveFilter = {
      OR: [{ contactId: null }, { contact: { archived: false } }]
    };

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
          where: {
            dateSent: { gte: start, lte: end },
            job: {
              archived: false,
              stage: { notIn: [...archivedJobStages] }
            }
          }
        }),
        this.prisma.outreach.count({
          where: {
            sentAt: { gte: start, lte: end },
            ...jobActiveFilter,
            OR: [...contactActiveFilter.OR]
          }
      }),
      this.prisma.followUp.count({
        where: {
          sentAt: { gte: start, lte: end },
          ...jobActiveFilter,
          OR: [...contactActiveFilter.OR]
        }
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

  async getRollingSevenDays() {
    const start = dayjs().subtract(6, 'day').startOf('day').toDate();
    const end = dayjs().endOf('day').toDate();
    const archivedJobStages = ['REJECTED', 'DORMANT'] as const;

    const jobActiveFilter = {
      OR: [
        { jobId: null },
        {
          job: {
            archived: false,
            stage: { notIn: [...archivedJobStages] }
          }
        }
      ]
    };

    const contactActiveFilter = {
      OR: [{ contactId: null }, { contact: { archived: false } }]
    };

    const [
      cvSent,
      outreach,
      followupsCompleted,
      eventsAttendedLegacy,
      boostTasksDoneLegacy,
      eventsAttendedGrow,
      boostsDoneGrow
    ] = await Promise.all([
      this.prisma.jobApplication.count({
        where: {
          dateSent: { gte: start, lte: end },
          job: {
            archived: false,
            stage: { notIn: [...archivedJobStages] }
          }
        }
      }),
      this.prisma.outreach.count({
        where: {
          sentAt: { gte: start, lte: end },
          ...jobActiveFilter,
          OR: [...contactActiveFilter.OR]
        }
      }),
      this.prisma.followUp.count({
        where: {
          sentAt: { gte: start, lte: end },
          ...jobActiveFilter,
          OR: [...contactActiveFilter.OR]
        }
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
      followUpsCompleted: followupsCompleted,
      eventsAttended: eventsAttendedLegacy + eventsAttendedGrow,
      boostTasksDone: boostTasksDoneLegacy + boostsDoneGrow
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
