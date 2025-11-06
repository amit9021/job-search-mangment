import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import dayjs from '../../utils/dayjs';
import { FollowupsService } from '../followups/followups.service';
import { JobsService } from '../jobs/jobs.service';
import { KpiService } from '../kpi/kpi.service';
import { OutreachService } from '../outreach/outreach.service';
import { StatsWeeklySummaryDto } from '../stats/dto/stats-weekly.dto';
import { StatsService } from '../stats/stats.service';
import { TasksService } from '../tasks/tasks.service';

import {
  DashboardNextBestAction,
  DashboardNotification,
  DashboardQueueItem,
  DashboardSummaryDto,
  DashboardSummaryWithMeta
} from './dto/dashboard-summary.dto';

type JobListItem = Awaited<ReturnType<JobsService['list']>> extends Array<infer T> ? T : never;
type FollowupItem =
  Awaited<ReturnType<FollowupsService['getDue']>> extends Array<infer T> ? T : never;

type DashboardConfig = {
  dailyTargetCv: number;
  dailyTargetWarm: number;
  cacheTtlSeconds: number;
  nba: {
    highHeatThreshold: number;
    mediumHeatThreshold: number;
    followUpLookaheadHours: number;
    staleTouchDays: number;
  };
};

type CacheEntry = {
  expiresAt: number;
  payload: DashboardSummaryDto;
  degraded: boolean;
};

type ActionableTasks = Awaited<ReturnType<TasksService['getActionableTasks']>>;
type StaleOutreachList = Awaited<ReturnType<OutreachService['findStaleWithoutOutcome']>>;

const DEFAULT_ACTIONABLE_TASKS: ActionableTasks = {
  dueToday: [],
  overdue: []
};

const ARCHIVED_JOB_STAGES = new Set(['REJECTED', 'DORMANT']);

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly timeoutMs = 1500;

  constructor(
    private readonly tasksService: TasksService,
    private readonly jobsService: JobsService,
    private readonly outreachService: OutreachService,
    private readonly followupsService: FollowupsService,
    private readonly kpiService: KpiService,
    private readonly statsService: StatsService,
    private readonly configService: ConfigService
  ) {}

  async getSummary(
    userId?: string | null,
    options: { force?: boolean; range?: number } = {}
  ): Promise<DashboardSummaryWithMeta> {
    const config = this.getDashboardConfig();
    const acceptedRange = new Set([7, 14, 30]);
    const requestedRange = options.range ?? 7;
    const range = acceptedRange.has(requestedRange) ? requestedRange : 7;
    const cacheKey = `${userId ?? 'anonymous'}:${range}`;
    const now = Date.now();

    if (!options.force) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return { payload: cached.payload, degraded: cached.degraded, cacheHit: true };
      }
    }

    const defaultStats = this.createEmptyStats(range);

    const [
      kpiTodayResult,
      jobsResult,
      actionableTasksResult,
      followupsTodayResult,
      followupsOverdueResult,
      staleOutreachResult,
      statsSummaryResult
    ] = await Promise.all([
      this.callWithTimeout(
        () => this.kpiService.getToday(),
        {
          cvSentToday: 0,
          cvTarget: config.dailyTargetCv,
          outreachToday: 0,
          outreachTarget: config.dailyTargetWarm,
          followupsDue: 0,
          seniorReviewsThisWeek: 0,
          heatBreakdown: []
        },
        'kpi.today'
      ),
      this.callWithTimeout(
        () => this.jobsService.list({ includeArchived: false }),
        [] as JobListItem[],
        'jobs.list'
      ),
      this.callWithTimeout(
        () => this.tasksService.getActionableTasks(),
        DEFAULT_ACTIONABLE_TASKS,
        'tasks.actionable'
      ),
      this.callWithTimeout(
        () => this.followupsService.getDue('today'),
        [] as FollowupItem[],
        'followups.today'
      ),
      this.callWithTimeout(
        () => this.followupsService.getDue('overdue'),
        [] as FollowupItem[],
        'followups.overdue'
      ),
      this.callWithTimeout(
        () => this.outreachService.findStaleWithoutOutcome(48),
        [] as StaleOutreachList,
        'outreach.stale'
      ),
      this.callWithTimeout(
        () => this.statsService.getWeeklySummary(range),
        defaultStats,
        'stats.weekly'
      )
    ]);

    const degraded =
      kpiTodayResult.degraded ||
      jobsResult.degraded ||
      actionableTasksResult.degraded ||
      followupsTodayResult.degraded ||
      followupsOverdueResult.degraded ||
      staleOutreachResult.degraded ||
      statsSummaryResult.degraded;

    const kpiToday = kpiTodayResult.value;
    const jobs = jobsResult.value;
    const actionableTasks = actionableTasksResult.value;
    const followupsTodayRaw = followupsTodayResult.value;
    const followupsOverdueRaw = followupsOverdueResult.value;
    const staleOutreachRaw = staleOutreachResult.value;
    const statsSummary = statsSummaryResult.value;

    const filterFollowup = (followup: FollowupItem) => {
      const job = followup.job as
        | (FollowupItem['job'] & { archived?: boolean; stage?: string })
        | undefined;
      if (job && (job.archived || (job.stage && ARCHIVED_JOB_STAGES.has(job.stage)))) {
        return false;
      }
      const contact = followup.contact as
        | (FollowupItem['contact'] & { archived?: boolean })
        | undefined;
      if (contact && contact.archived) {
        return false;
      }
      return true;
    };

    const followupsToday = followupsTodayRaw.filter(filterFollowup);
    const followupsOverdue = followupsOverdueRaw.filter(filterFollowup);
    const overdueFollowupIds = new Set(followupsOverdue.map((item) => item.id));

    const staleOutreach = staleOutreachRaw.filter((entry) => {
      const job = entry.job as
        | (typeof entry.job & { archived?: boolean; stage?: string })
        | undefined;
      if (job && (job.archived || (job.stage && ARCHIVED_JOB_STAGES.has(job.stage)))) {
        return false;
      }
      const contact = entry.contact as (typeof entry.contact & { archived?: boolean }) | undefined;
      if (contact && contact.archived) {
        return false;
      }
      return true;
    });

    const dailyTargetCv = config.dailyTargetCv;
    const dailyTargetWarm = config.dailyTargetWarm;

    const followUpsDueCount = followupsToday.length + followupsOverdue.length;

    const sparkTailored = statsSummary.series.cvsSent.map((point) => point.v);
    const sparkOutreach = statsSummary.series.warmOutreach.map((point) => point.v);

    const summary: DashboardSummaryDto = {
      kpis: {
        tailoredCvs: {
          sentToday: kpiToday.cvSentToday ?? 0,
          targetDaily: dailyTargetCv,
          spark: sparkTailored
        },
        outreach: {
          sentToday: kpiToday.outreachToday ?? 0,
          targetDaily: dailyTargetWarm,
          spark: sparkOutreach
        },
        followUpsDue: followUpsDueCount,
        seniorReviewsThisWeek: kpiToday.seniorReviewsThisWeek ?? 0
      },
      nextBestAction: this.computeNextBestAction({
        jobs,
        config,
        followUpsDueCount,
        warmOutreachCountToday: kpiToday.outreachToday ?? 0,
        tailoredCvCountToday: kpiToday.cvSentToday ?? 0
      }),
      notifications: this.buildNotifications({
        followupsToday,
        followupsOverdue,
        dailyTargetCv,
        dailyTargetWarm,
        cvsSentToday: kpiToday.cvSentToday ?? 0,
        warmOutreachSentToday: kpiToday.outreachToday ?? 0,
        staleOutreachCount: staleOutreach.length,
        degraded
      }),
      todayQueue: this.buildTodayQueue({
        followupsToday,
        followupsOverdue,
        overdueFollowupIds,
        actionableTasks,
        staleOutreach
      })
    };

    const cacheEntry: CacheEntry = {
      payload: summary,
      degraded,
      expiresAt: now + config.cacheTtlSeconds * 1000
    };
    this.cache.set(cacheKey, cacheEntry);

    return {
      payload: summary,
      degraded,
      cacheHit: false
    };
  }

  private computeNextBestAction(params: {
    jobs: JobListItem[];
    config: DashboardConfig;
    followUpsDueCount: number;
    warmOutreachCountToday: number;
    tailoredCvCountToday: number;
  }): DashboardNextBestAction {
    const { jobs, config, warmOutreachCountToday } = params;
    const now = dayjs();
    const lookahead = now.add(config.nba.followUpLookaheadHours, 'hour');
    const staleTouchCutoff = now.subtract(config.nba.staleTouchDays, 'day');

    const sortedJobs = [...jobs].sort((a, b) => {
      if (b.heat !== a.heat) {
        return (b.heat ?? 0) - (a.heat ?? 0);
      }
      const aTouch = a.lastTouchAt ? new Date(a.lastTouchAt).getTime() : 0;
      const bTouch = b.lastTouchAt ? new Date(b.lastTouchAt).getTime() : 0;
      return aTouch - bTouch;
    });

    const highHeatCandidate = sortedJobs.find((job) => {
      if ((job.heat ?? 0) < config.nba.highHeatThreshold) {
        return false;
      }
      if (!job.nextFollowUpAt) {
        return true;
      }
      return dayjs(job.nextFollowUpAt).isAfter(lookahead);
    });

    if (highHeatCandidate) {
      return {
        title: `Follow up with ${highHeatCandidate.company}`,
        reason: 'High-heat role without a follow-up scheduled in the next 48 hours.',
        suggestedAction: 'follow_up',
        job: this.mapJobReference(highHeatCandidate),
        ctaLink: `/jobs?focus=${highHeatCandidate.id}&followups=today&view=table`
      };
    }

    const mediumHeatCandidate = sortedJobs.find((job) => {
      const heat = job.heat ?? 0;
      if (heat < config.nba.mediumHeatThreshold || heat >= config.nba.highHeatThreshold) {
        return false;
      }
      const lastTouch = job.lastTouchAt ? dayjs(job.lastTouchAt) : null;
      const hasLinkedContacts = Array.isArray(job.contacts) && job.contacts.length > 0;
      return hasLinkedContacts && (!lastTouch || lastTouch.isBefore(staleTouchCutoff));
    });

    if (mediumHeatCandidate) {
      const daysSinceTouch = mediumHeatCandidate.lastTouchAt
        ? Math.max(3, now.diff(dayjs(mediumHeatCandidate.lastTouchAt), 'day'))
        : config.nba.staleTouchDays;
      return {
        title: `Reconnect with ${mediumHeatCandidate.company}`,
        reason: `Medium-heat opportunity has been quiet for ${daysSinceTouch} days with a warm contact ready.`,
        suggestedAction: 'send_outreach',
        job: this.mapJobReference(mediumHeatCandidate),
        ctaLink: `/jobs?focus=${mediumHeatCandidate.id}&view=table`
      };
    }

    if (warmOutreachCountToday < config.dailyTargetWarm) {
      const remaining = config.dailyTargetWarm - warmOutreachCountToday;
      return {
        title: 'Warm up your network',
        reason: `Send ${remaining} more warm outreach${remaining > 1 ? 'es' : ''} to stay on target today.`,
        suggestedAction: 'send_outreach',
        job: null,
        ctaLink: '/contacts?strength=STRONG'
      };
    }

    return {
      title: 'Review pipeline',
      reason: 'You are on track today. Review recent applications and fine-tune upcoming moves.',
      suggestedAction: 'review',
      job: null,
      ctaLink: '/jobs?view=pipeline'
    };
  }

  private buildTodayQueue(params: {
    followupsToday: FollowupItem[];
    followupsOverdue: FollowupItem[];
    overdueFollowupIds: Set<string>;
    actionableTasks: ActionableTasks;
    staleOutreach: StaleOutreachList;
  }): DashboardQueueItem[] {
    const { followupsToday, followupsOverdue, overdueFollowupIds, actionableTasks, staleOutreach } =
      params;
    const items: DashboardQueueItem[] = [];
    const seen = new Set<string>();

    const pushItem = (id: string, item: DashboardQueueItem) => {
      if (seen.has(id)) {
        return;
      }
      seen.add(id);
      items.push(item);
    };

    const mapFollowup = (followup: FollowupItem): DashboardQueueItem => {
      const titleBase = followup.contact?.name ?? followup.job?.company ?? 'Follow-up';
      const title = `Follow up with ${titleBase}`;

      const followupScope = overdueFollowupIds.has(followup.id) ? 'overdue' : 'today';
      let ctaLink = followup.jobId
        ? `/jobs?focus=${followup.jobId}&followups=${followupScope}&view=table`
        : followup.contactId
          ? `/contacts?focus=${followup.contactId}&section=followups`
          : '/tasks?view=today';
      const separator = ctaLink.includes('?') ? '&' : '?';
      ctaLink = `${ctaLink}${separator}followupId=${followup.id}`;

      return {
        type: 'follow_up',
        title,
        dueAt: followup.dueAt ? new Date(followup.dueAt).toISOString() : null,
        ctaLink
      };
    };

    [...followupsOverdue, ...followupsToday].forEach((followup) => {
      pushItem(followup.id, mapFollowup(followup));
    });

    const mapTask = (task: {
      id: string;
      title: string;
      dueAt: Date | null;
      links: Record<string, unknown>;
    }): DashboardQueueItem => {
      let ctaLink = `/tasks?highlight=${task.id}`;
      if (typeof task.links.jobId === 'string') {
        ctaLink = `/jobs?focus=${task.links.jobId}&view=table`;
      }
      if (typeof task.links.contactId === 'string') {
        ctaLink = `/contacts?focus=${task.links.contactId}`;
      }
      return {
        type: 'task',
        title: task.title,
        dueAt: task.dueAt ? new Date(task.dueAt).toISOString() : null,
        ctaLink
      };
    };

    actionableTasks.overdue.forEach((task) => pushItem(`task-${task.id}`, mapTask(task)));
    actionableTasks.dueToday.forEach((task) => pushItem(`task-today-${task.id}`, mapTask(task)));

    staleOutreach.forEach((entry) => {
      const name = entry.contact?.name ?? entry.job?.company ?? 'contact';
      let ctaLink = entry.jobId
        ? `/jobs?focus=${entry.jobId}&section=outreach&view=table`
        : entry.contactId
          ? `/contacts?focus=${entry.contactId}&section=outreach`
          : '/outreach';
      const separator = ctaLink.includes('?') ? '&' : '?';
      ctaLink = `${ctaLink}${separator}outreachId=${entry.id}`;
      pushItem(entry.id, {
        type: 'stale_outreach',
        title: `Nudge ${name}`,
        dueAt: entry.sentAt ? new Date(entry.sentAt).toISOString() : null,
        ctaLink
      });
    });

    return items;
  }

  private buildNotifications(params: {
    followupsToday: FollowupItem[];
    followupsOverdue: FollowupItem[];
    dailyTargetCv: number;
    dailyTargetWarm: number;
    cvsSentToday: number;
    warmOutreachSentToday: number;
    staleOutreachCount: number;
    degraded: boolean;
  }): DashboardNotification[] {
    const {
      followupsToday,
      followupsOverdue,
      dailyTargetCv,
      dailyTargetWarm,
      cvsSentToday,
      warmOutreachSentToday,
      staleOutreachCount,
      degraded
    } = params;
    const notifications: DashboardNotification[] = [];

    if (followupsOverdue.length > 0) {
      notifications.push({
        severity: 'high',
        text: `${followupsOverdue.length} follow-up${followupsOverdue.length > 1 ? 's are' : ' is'} overdue.`,
        ctaLink: '/jobs?view=table&followups=overdue'
      });
    }

    if (followupsToday.length > 0) {
      notifications.push({
        severity: 'med',
        text: `${followupsToday.length} follow-up${followupsToday.length > 1 ? 's are' : ' is'} due today.`,
        ctaLink: '/jobs?view=table&followups=today'
      });
    }

    const cvGap = Math.max(0, dailyTargetCv - cvsSentToday);
    if (cvGap > 0) {
      notifications.push({
        severity: 'med',
        text: `Send ${cvGap} tailored CV${cvGap > 1 ? 's' : ''} to hit today's target.`,
        ctaLink: '/jobs?view=table&heat=0'
      });
    }

    const warmGap = Math.max(0, dailyTargetWarm - warmOutreachSentToday);
    if (warmGap > 0) {
      notifications.push({
        severity: 'med',
        text: `Complete ${warmGap} warm outreach${warmGap > 1 ? 'es' : ''} to stay on track.`,
        ctaLink: '/contacts?strength=STRONG'
      });
    }

    if (staleOutreachCount > 0) {
      notifications.push({
        severity: 'low',
        text: `${staleOutreachCount} outreach${staleOutreachCount > 1 ? 'es have' : ' has'} no response after 48 hours.`,
        ctaLink: '/contacts?filter=stale_outreach'
      });
    }

    if (degraded) {
      notifications.push({
        severity: 'low',
        text: 'Some dashboard data is temporarily unavailable. Please refresh soon.',
        ctaLink: null
      });
    }

    return notifications;
  }

  private mapJobReference(job: JobListItem) {
    return {
      id: job.id,
      company: job.company,
      role: job.role,
      heat: Number(job.heat ?? 0)
    };
  }

  private async callWithTimeout<T>(factory: () => Promise<T>, fallback: T, label: string) {
    let timeoutHandle: NodeJS.Timeout | null = null;
    try {
      const result = await Promise.race([
        factory(),
        new Promise<T>((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error('timeout')), this.timeoutMs);
        })
      ]);
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      return { value: result, degraded: false };
    } catch (error) {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      this.logger.warn(
        `Dashboard aggregation degraded for ${label}: ${String((error as Error)?.message ?? error)}`
      );
      return { value: fallback, degraded: true };
    }
  }

  private createEmptyStats(range: number): StatsWeeklySummaryDto {
    const start = this.now()
      .clone()
      .subtract(range - 1, 'day')
      .startOf('day');
    const points: { d: string; v: number }[] = [];
    for (let i = 0; i < range; i += 1) {
      points.push({ d: start.clone().add(i, 'day').format('YYYY-MM-DD'), v: 0 });
    }

    const cloneSeries = () => points.map((point) => ({ ...point }));

    return {
      range,
      series: {
        cvsSent: cloneSeries(),
        warmOutreach: cloneSeries(),
        followupsDone: cloneSeries(),
        followupsDue: cloneSeries()
      },
      heat: {
        h0: 0,
        h1: 0,
        h2: 0,
        h3: 0,
        delta: { h0: 0, h1: 0, h2: 0, h3: 0 }
      },
      degraded: true
    };
  }

  private getDashboardConfig(): DashboardConfig {
    const defaultConfig: DashboardConfig = {
      dailyTargetCv: 5,
      dailyTargetWarm: 5,
      cacheTtlSeconds: 15,
      nba: {
        highHeatThreshold: 3,
        mediumHeatThreshold: 2,
        followUpLookaheadHours: 48,
        staleTouchDays: 3
      }
    };

    const configured = this.configService.get<Partial<DashboardConfig>>('app.dashboard') ?? {};
    const configuredNba = (configured.nba ?? {}) as Partial<DashboardConfig['nba']>;

    return {
      ...defaultConfig,
      ...configured,
      nba: {
        ...defaultConfig.nba,
        ...configuredNba
      }
    };
  }

  private now() {
    return dayjs();
  }
}
