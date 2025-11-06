import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import dayjs from '../../utils/dayjs';

import { StatsWeeklySummaryDto, StatsSeriesPoint } from './dto/stats-weekly.dto';

type TimedResult<T> = { value: T; degraded: boolean };

const SUPPORTED_RANGES = new Set([7, 14, 30]);
const ARCHIVED_JOB_STAGES = ['REJECTED', 'DORMANT'] as const;

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);
  private readonly timeoutMs = 1500;
  private readonly timezone = process.env.TIMEZONE ?? 'UTC';

  constructor(private readonly prisma: PrismaService) {}

  async getWeeklySummary(rangeInput: number): Promise<StatsWeeklySummaryDto> {
    const range = SUPPORTED_RANGES.has(rangeInput) ? rangeInput : 7;
    const end = this.now().endOf('day');
    const start = end
      .clone()
      .subtract(range - 1, 'day')
      .startOf('day');
    const prevEnd = start.clone().subtract(1, 'day').endOf('day');
    const prevStart = prevEnd
      .clone()
      .subtract(range - 1, 'day')
      .startOf('day');

    const days: string[] = [];
    const dayIndex = new Map<string, number>();
    for (let i = 0; i < range; i += 1) {
      const key = start.clone().add(i, 'day').format('YYYY-MM-DD');
      days.push(key);
      dayIndex.set(key, i);
    }

    const zeroSeries = (): StatsSeriesPoint[] => days.map((d) => ({ d, v: 0 }));

    const [
      applicationsResult,
      outreachResult,
      followupsDoneResult,
      followupsDueResult,
      heatNowResult,
      heatPrevResult
    ] = await Promise.all([
      this.callWithTimeout(() => this.fetchApplications(start, end), [] as Date[], 'applications'),
      this.callWithTimeout(() => this.fetchOutreach(start, end), [] as Date[], 'outreach'),
      this.callWithTimeout(
        () => this.fetchFollowupsDone(start, end),
        [] as Date[],
        'followups.done'
      ),
      this.callWithTimeout(() => this.fetchFollowupsDue(start, end), [] as Date[], 'followups.due'),
      this.callWithTimeout(
        () => this.fetchHeatCounts(end),
        [] as Array<{ heat: number; count: number }>,
        'heat.current'
      ),
      this.callWithTimeout(
        () => this.fetchHeatCounts(prevEnd, prevStart),
        [] as Array<{ heat: number; count: number }>,
        'heat.previous'
      )
    ]);

    const cvsSent = zeroSeries();
    const outreach = zeroSeries();
    const followupsDone = zeroSeries();
    const followupsDue = zeroSeries();

    const bump = (series: StatsSeriesPoint[], index: number, increment = 1) => {
      if (index >= 0 && index < series.length) {
        series[index].v += increment;
      }
    };

    const toKey = (value: Date) => dayjs(value).tz(this.timezone).format('YYYY-MM-DD');

    applicationsResult.value.forEach((date) => {
      const idx = dayIndex.get(toKey(date));
      if (idx !== undefined) {
        bump(cvsSent, idx);
      }
    });

    outreachResult.value.forEach((date) => {
      const idx = dayIndex.get(toKey(date));
      if (idx !== undefined) {
        bump(outreach, idx);
      }
    });

    followupsDoneResult.value.forEach((date) => {
      const idx = dayIndex.get(toKey(date));
      if (idx !== undefined) {
        bump(followupsDone, idx);
      }
    });

    followupsDueResult.value.forEach((date) => {
      const idx = dayIndex.get(toKey(date));
      if (idx !== undefined) {
        bump(followupsDue, idx);
      }
    });

    const heat = this.composeHeat(heatNowResult.value, heatPrevResult.value);
    const degraded =
      applicationsResult.degraded ||
      outreachResult.degraded ||
      followupsDoneResult.degraded ||
      followupsDueResult.degraded ||
      heatNowResult.degraded ||
      heatPrevResult.degraded;

    return {
      range,
      series: {
        cvsSent,
        warmOutreach: outreach,
        followupsDone,
        followupsDue
      },
      heat,
      degraded
    };
  }

  private composeHeat(
    current: Array<{ heat: number; count: number }>,
    previous: Array<{ heat: number; count: number }>
  ) {
    const base = { h0: 0, h1: 0, h2: 0, h3: 0 };
    const delta = { h0: 0, h1: 0, h2: 0, h3: 0 };

    current.forEach(({ heat, count }) => {
      const key = `h${Math.max(0, Math.min(3, heat))}` as keyof typeof base;
      base[key] += count;
    });

    const prev = { h0: 0, h1: 0, h2: 0, h3: 0 };
    previous.forEach(({ heat, count }) => {
      const key = `h${Math.max(0, Math.min(3, heat))}` as keyof typeof prev;
      prev[key] += count;
    });

    (Object.keys(base) as Array<keyof typeof base>).forEach((key) => {
      delta[key] = base[key] - prev[key];
    });

    return { ...base, delta };
  }

  private async fetchApplications(start: dayjs.Dayjs, end: dayjs.Dayjs) {
    const records = await this.prisma.jobApplication.findMany({
      where: {
        dateSent: { gte: start.toDate(), lte: end.toDate() },
        job: {
          archived: false,
          stage: { notIn: [...ARCHIVED_JOB_STAGES] }
        }
      },
      select: { dateSent: true }
    });
    return records.map((record) => record.dateSent);
  }

  private async fetchOutreach(start: dayjs.Dayjs, end: dayjs.Dayjs) {
    const records = await this.prisma.outreach.findMany({
      where: {
        sentAt: { gte: start.toDate(), lte: end.toDate() }
      },
      select: {
        sentAt: true,
        job: { select: { archived: true, stage: true } },
        contact: { select: { archived: true } }
      }
    });

    return records
      .filter((record) => {
        if (
          record.job &&
          (record.job.archived ||
            (ARCHIVED_JOB_STAGES as readonly string[]).includes(record.job.stage ?? ''))
        ) {
          return false;
        }
        if (record.contact && record.contact.archived) {
          return false;
        }
        return true;
      })
      .map((record) => record.sentAt);
  }

  private async fetchFollowupsDone(start: dayjs.Dayjs, end: dayjs.Dayjs) {
    const records = await this.prisma.followUp.findMany({
      where: {
        sentAt: { not: null, gte: start.toDate(), lte: end.toDate() },
        AND: [
          {
            OR: [
              { jobId: null },
              {
                job: {
                  archived: false,
                  stage: { notIn: [...ARCHIVED_JOB_STAGES] }
                }
              }
            ]
          },
          {
            OR: [
              { contactId: null },
              {
                contact: {
                  archived: false
                }
              }
            ]
          }
        ]
      },
      select: { sentAt: true }
    });
    return records.map((record) => record.sentAt as Date);
  }

  private async fetchFollowupsDue(start: dayjs.Dayjs, end: dayjs.Dayjs) {
    const records = await this.prisma.followUp.findMany({
      where: {
        sentAt: null,
        dueAt: { gte: start.toDate(), lte: end.toDate() },
        AND: [
          {
            OR: [
              { jobId: null },
              {
                job: {
                  archived: false,
                  stage: { notIn: [...ARCHIVED_JOB_STAGES] }
                }
              }
            ]
          },
          {
            OR: [
              { contactId: null },
              {
                contact: {
                  archived: false
                }
              }
            ]
          }
        ]
      },
      select: { dueAt: true }
    });
    return records.map((record) => record.dueAt);
  }

  private async fetchHeatCounts(
    end: dayjs.Dayjs,
    start?: dayjs.Dayjs
  ): Promise<Array<{ heat: number; count: number }>> {
    const where: Record<string, unknown> = {
      archived: false,
      stage: { notIn: ARCHIVED_JOB_STAGES }
    };

    if (start) {
      where.updatedAt = { gte: start.toDate(), lte: end.toDate() };
    } else {
      where.updatedAt = { lte: end.toDate() };
    }

    const groups = await this.prisma.job.groupBy({
      by: ['heat'],
      where,
      _count: { _all: true }
    });

    return groups.map((group) => ({
      heat: group.heat,
      count: group._count._all
    }));
  }

  private async callWithTimeout<T>(
    factory: () => Promise<T>,
    fallback: T,
    label: string
  ): Promise<TimedResult<T>> {
    let timeoutHandle: NodeJS.Timeout | null = null;
    try {
      const value = await Promise.race([
        factory(),
        new Promise<T>((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error('timeout')), this.timeoutMs);
        })
      ]);
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      return { value, degraded: false };
    } catch (error) {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      this.logger.warn(
        `StatsService degraded for ${label}: ${String((error as Error)?.message ?? error)}`
      );
      return { value: fallback, degraded: true };
    }
  }

  private now() {
    return dayjs().tz(this.timezone);
  }
}
