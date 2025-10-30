import { Injectable } from '@nestjs/common';
import { EventStatus, JobStage } from '@prisma/client';
import dayjs from '../../utils/dayjs';
import { PrismaService } from '../../prisma/prisma.service';

export type RecommendationResult = {
  score: number;
  title: string;
  action: string;
  ref: Record<string, unknown>;
};

@Injectable()
export class RecommendationService {
  constructor(private readonly prisma: PrismaService) {}

  async getNextRecommendation() {
    const [jobs, followupsDue, cvToday, outreachToday, contactsWithReferrals, pendingReviews, eventsToday, openBoosts] =
      await Promise.all([
        this.prisma.job.findMany({
          where: { stage: { notIn: [JobStage.REJECTED, JobStage.DORMANT] } },
          include: { outreaches: { orderBy: { sentAt: 'desc' }, take: 1 } }
        }),
        this.getDueFollowupsCount(),
        this.getCvSentToday(),
        this.getOutreachToday(),
        this.prisma.contact.count({
          where: {
            referrals: { some: {} }
          }
        }),
        this.prisma.codeReview.findMany({ where: { reviewedAt: null }, include: { project: true, contact: true } }),
        this.prisma.event.findMany({
          where: {
            date: {
              gte: dayjs().startOf('day').toDate(),
              lte: dayjs().endOf('day').toDate()
            }
          }
        }),
        this.prisma.boostTask.findMany({ where: { doneAt: null }, orderBy: { impactScore: 'desc' } })
      ]);

    const jobSuggestion = this.computeJobSuggestion(jobs, followupsDue, cvToday, outreachToday);
    const networkingSuggestion = this.computeNetworkingSuggestion(contactsWithReferrals, followupsDue);
    const growthSuggestion = this.computeGrowthSuggestion({
      cvToday,
      outreachToday,
      pendingReviews,
      eventsToday,
      openBoosts
    });

    const suggestions = [jobSuggestion, networkingSuggestion, growthSuggestion].filter(Boolean) as RecommendationResult[];
    if (suggestions.length === 0) {
      return {
        title: 'Great job!',
        action: 'Maintain momentum with a quick win task.',
        ref: {},
        score: 0
      };
    }
    suggestions.sort((a, b) => b.score - a.score);
    return suggestions[0];
  }

  private computeJobSuggestion(jobs: any[], followupsDue: number, cvToday: number, outreachToday: number): RecommendationResult | null {
    if (!jobs.length) {
      return null;
    }

    const scored = jobs.map((job) => {
      const heatWeight = [0, 20, 40, 60][job.heat] ?? 0;
      const deadlineScore = job.deadline
        ? job.deadline < dayjs().add(3, 'day').toDate()
          ? 20
          : job.deadline < dayjs().add(7, 'day').toDate()
          ? 10
          : 0
        : 0;
      const lastTouch = job.lastTouchAt ? dayjs(job.lastTouchAt) : dayjs(job.createdAt);
      const staleness = lastTouch.isBefore(dayjs().subtract(7, 'day'))
        ? 20
        : lastTouch.isBefore(dayjs().subtract(3, 'day'))
        ? 10
        : 0;
      const followupPressure = followupsDue > 0 ? 10 : 0;
      const cvGapPenalty = cvToday < 5 ? 5 : 0;
      const outreachGapPenalty = outreachToday < 5 ? 5 : 0;
      return {
        job,
        score: heatWeight + deadlineScore + staleness + followupPressure + cvGapPenalty + outreachGapPenalty
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    return {
      score: top.score,
      title: `Focus on ${top.job.company} – ${top.job.role}`,
      action: 'Advance the conversation or send a tailored follow-up.',
      ref: { jobId: top.job.id }
    };
  }

  private computeNetworkingSuggestion(contactsWithReferrals: number, followupsDue: number): RecommendationResult | null {
    const networkingScore = contactsWithReferrals * 20 + followupsDue * 10;
    if (networkingScore <= 0) {
      return null;
    }
    return {
      score: networkingScore,
      title: 'Engage your network',
      action: 'Reach out to a high converting contact and plan a follow-up.',
      ref: {}
    };
  }

  private computeGrowthSuggestion({
    cvToday,
    outreachToday,
    pendingReviews,
    eventsToday,
    openBoosts
  }: {
    cvToday: number;
    outreachToday: number;
    pendingReviews: any[];
    eventsToday: any[];
    openBoosts: any[];
  }): RecommendationResult | null {
    let score = 0;
    if (cvToday < 5) score += 15;
    if (outreachToday < 5) score += 15;
    if (pendingReviews.length) score += 25;
    if (eventsToday.some((event) => event.status === EventStatus.PLANNED)) score += 20;
    if (openBoosts.length) score += openBoosts[0].impactScore;

    if (score === 0) {
      return null;
    }

    const primaryAction = pendingReviews.length
      ? `Request feedback on ${pendingReviews[0].project.name}`
      : eventsToday.length
      ? `Prep for ${eventsToday[0].name}`
      : openBoosts.length
      ? `Tackle boost task: ${openBoosts[0].title}`
      : 'Close the daily CV/outreach gap';

    return {
      score,
      title: 'Invest in growth',
      action: primaryAction,
      ref: {
        reviewId: pendingReviews[0]?.id,
        eventId: eventsToday[0]?.id,
        boostTaskId: openBoosts[0]?.id
      }
    };
  }

  private async getDueFollowupsCount() {
    return this.prisma.followUp.count({
      where: {
        sentAt: null,
        dueAt: { lte: dayjs().endOf('day').toDate() }
      }
    });
  }

  private async getCvSentToday() {
    return this.prisma.jobApplication.count({
      where: {
        dateSent: {
          gte: dayjs().startOf('day').toDate(),
          lte: dayjs().endOf('day').toDate()
        }
      }
    });
  }

  private async getOutreachToday() {
    return this.prisma.outreach.count({
      where: {
        sentAt: {
          gte: dayjs().startOf('day').toDate(),
          lte: dayjs().endOf('day').toDate()
        }
      }
    });
  }
}
