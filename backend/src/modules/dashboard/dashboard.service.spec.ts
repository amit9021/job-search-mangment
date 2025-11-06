import dayjs from '../../utils/dayjs';
import { DashboardService } from './dashboard.service';
import { TasksService } from '../tasks/tasks.service';
import { JobsService } from '../jobs/jobs.service';
import { OutreachService } from '../outreach/outreach.service';
import { FollowupsService } from '../followups/followups.service';
import { KpiService } from '../kpi/kpi.service';
import { StatsService } from '../stats/stats.service';

describe('DashboardService', () => {
  const dashboardConfig = {
    dailyTargetCv: 7,
    dailyTargetWarm: 6,
    cacheTtlSeconds: 10,
    nba: {
      highHeatThreshold: 3,
      mediumHeatThreshold: 2,
      followUpLookaheadHours: 48,
      staleTouchDays: 3
    }
  };

  const createService = () => {
    const tasksService = {
      getActionableTasks: jest.fn()
    } as unknown as TasksService;
    const jobsService = {
      list: jest.fn()
    } as unknown as JobsService;
    const outreachService = {
      findStaleWithoutOutcome: jest.fn()
    } as unknown as OutreachService;
    const followupsService = {
      getDue: jest.fn()
    } as unknown as FollowupsService;
    const kpiService = {
      getToday: jest.fn()
    } as unknown as KpiService;
    const statsService = {
      getWeeklySummary: jest.fn()
    } as unknown as StatsService;
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'app.dashboard') {
          return dashboardConfig;
        }
        return undefined;
      })
    };

    const service = new DashboardService(
      tasksService,
      jobsService,
      outreachService,
      followupsService,
      kpiService,
      statsService,
      configService as any
    );

    return {
      service,
      tasksService: tasksService as jest.Mocked<TasksService>,
      jobsService: jobsService as jest.Mocked<JobsService>,
      outreachService: outreachService as jest.Mocked<OutreachService>,
      followupsService: followupsService as jest.Mocked<FollowupsService>,
      kpiService: kpiService as jest.Mocked<KpiService>,
      statsService: statsService as jest.Mocked<StatsService>,
      configService: configService as { get: jest.Mock }
    };
  };

  it('selects high-heat job for next best action', () => {
    const { service } = createService();
    const actions = (service as any).computeNextBestAction({
      jobs: [
        {
          id: 'job-high',
          company: 'Acme',
          role: 'Senior Developer',
          heat: 3,
          nextFollowUpAt: null
        }
      ],
      config: dashboardConfig,
      followUpsDueCount: 0,
      warmOutreachCountToday: 0,
      tailoredCvCountToday: 0
    });

    expect(actions.suggestedAction).toBe('follow_up');
    expect(actions.job).toMatchObject({ id: 'job-high', company: 'Acme' });
  });

  it('falls back to medium-heat outreach suggestion', () => {
    const { service } = createService();
    const threeDaysAgo = dayjs().subtract(4, 'day').toDate();
    const action = (service as any).computeNextBestAction({
      jobs: [
        {
          id: 'job-medium',
          company: 'Beta Corp',
          role: 'Engineer',
          heat: 2,
          lastTouchAt: threeDaysAgo,
          contacts: [{ id: 'contact-1' }]
        }
      ],
      config: dashboardConfig,
      followUpsDueCount: 0,
      warmOutreachCountToday: 6,
      tailoredCvCountToday: 0
    });

    expect(action.suggestedAction).toBe('send_outreach');
    expect(action.job?.id).toBe('job-medium');
  });

  it('encourages warm outreach when no job needs attention', () => {
    const { service } = createService();
    const action = (service as any).computeNextBestAction({
      jobs: [],
      config: dashboardConfig,
      followUpsDueCount: 0,
      warmOutreachCountToday: 2,
      tailoredCvCountToday: 0
    });

    expect(action.suggestedAction).toBe('send_outreach');
    expect(action.job).toBeNull();
  });

  it('orders notifications by severity and context', () => {
    const { service } = createService();
    const notifications = (service as any).buildNotifications({
      followupsToday: [{ id: 'f1' }],
      followupsOverdue: [{ id: 'f2' }, { id: 'f3' }],
      dailyTargetCv: 7,
      dailyTargetWarm: 6,
      cvsSentToday: 3,
      warmOutreachSentToday: 1,
      staleOutreachCount: 2,
      degraded: true
    });

    expect(notifications[0].severity).toBe('high');
    expect(notifications[1].severity).toBe('med');
    expect(notifications[notifications.length - 1].text).toContain('temporarily unavailable');
  });

  it('uses configured daily targets when building summary', async () => {
    const {
      service,
      tasksService,
      jobsService,
      kpiService,
      followupsService,
      outreachService,
      statsService
    } = createService();

    tasksService.getActionableTasks.mockResolvedValue({ dueToday: [], overdue: [] });
    jobsService.list.mockResolvedValue([]);
    followupsService.getDue.mockResolvedValue([]);
    outreachService.findStaleWithoutOutcome.mockResolvedValue([]);
    kpiService.getToday.mockResolvedValue({
      cvSentToday: 2,
      cvTarget: dashboardConfig.dailyTargetCv,
      outreachToday: 3,
      outreachTarget: dashboardConfig.dailyTargetWarm,
      followupsDue: 0,
      seniorReviewsThisWeek: 1,
      heatBreakdown: []
    });

    const baseSeries = Array.from({ length: 7 }, (_, index) => ({
      d: `2025-11-0${index + 1}`,
      v: index
    }));

    statsService.getWeeklySummary.mockResolvedValue({
      range: 7,
      series: {
        cvsSent: baseSeries,
        warmOutreach: baseSeries.map((point) => ({ ...point, v: point.v + 1 })),
        followupsDone: baseSeries.map((point) => ({ ...point, v: 0 })),
        followupsDue: baseSeries.map((point) => ({ ...point, v: 0 }))
      },
      heat: {
        h0: 0,
        h1: 0,
        h2: 0,
        h3: 0,
        delta: { h0: 0, h1: 0, h2: 0, h3: 0 }
      },
      degraded: false
    });

    const result = await service.getSummary('user-1');

    expect(statsService.getWeeklySummary).toHaveBeenCalledWith(7);

    expect(result.payload.kpis.tailoredCvs.targetDaily).toBe(dashboardConfig.dailyTargetCv);
    expect(result.payload.kpis.outreach.targetDaily).toBe(dashboardConfig.dailyTargetWarm);
    expect(result.payload.kpis.tailoredCvs.spark).toEqual(baseSeries.map((point) => point.v));
    expect(result.payload.kpis.outreach.spark).toEqual(
      baseSeries.map((point) => point.v + 1)
    );
    expect(result.cacheHit).toBe(false);

    // Subsequent request should be served from cache.
    const cached = await service.getSummary('user-1');
    expect(cached.cacheHit).toBe(true);
  });
});
