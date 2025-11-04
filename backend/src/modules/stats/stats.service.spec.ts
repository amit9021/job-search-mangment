import dayjs from '../../utils/dayjs';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  const createService = () => {
    const prismaMock = {
      jobApplication: { findMany: jest.fn() },
      outreach: { findMany: jest.fn() },
      followUp: { findMany: jest.fn() },
      job: { groupBy: jest.fn() }
    };

    const service = new StatsService(prismaMock as any);
    return { service, prismaMock };
  };

  it('builds series buckets and heat deltas for 7-day range', async () => {
    const { service, prismaMock } = createService();
    const now = dayjs('2025-11-07T12:00:00Z');
    (service as any).now = jest.fn(() => now);

    prismaMock.jobApplication.findMany.mockResolvedValue([
      { dateSent: new Date('2025-11-05T10:00:00Z') },
      { dateSent: new Date('2025-11-05T14:00:00Z') },
      { dateSent: new Date('2025-11-07T09:00:00Z') }
    ]);

    prismaMock.outreach.findMany.mockResolvedValue([
      {
        sentAt: new Date('2025-11-06T10:00:00Z'),
        job: { archived: false, stage: 'APPLIED' },
        contact: { archived: false }
      },
      {
        sentAt: new Date('2025-11-04T10:00:00Z'),
        job: { archived: true, stage: 'APPLIED' },
        contact: { archived: false }
      }
    ]);

    prismaMock.followUp.findMany
      .mockResolvedValueOnce([
        { sentAt: new Date('2025-11-02T08:00:00Z') },
        { sentAt: new Date('2025-11-07T08:30:00Z') }
      ])
      .mockResolvedValueOnce([
        { dueAt: new Date('2025-11-03T08:00:00Z') }
      ]);

    prismaMock.job.groupBy
      .mockResolvedValueOnce([
        { heat: 0, _count: { _all: 3 } },
        { heat: 2, _count: { _all: 1 } }
      ])
      .mockResolvedValueOnce([
        { heat: 0, _count: { _all: 2 } },
        { heat: 2, _count: { _all: 2 } }
      ]);

    const result = await service.getWeeklySummary(7);

    expect(result.range).toBe(7);
    expect(result.degraded).toBe(false);
    expect(result.series.cvsSent).toHaveLength(7);
    const cvPoint = result.series.cvsSent.find((point) => point.d === '2025-11-05');
    expect(cvPoint?.v).toBe(2);

    const outreachPoint = result.series.warmOutreach.find((point) => point.d === '2025-11-06');
    expect(outreachPoint?.v).toBe(1);

    expect(result.heat).toEqual({
      h0: 3,
      h1: 0,
      h2: 1,
      h3: 0,
      delta: { h0: 1, h1: 0, h2: -1, h3: 0 }
    });
  });

  it('defaults to 7-day range when unsupported value provided', async () => {
    const { service, prismaMock } = createService();
    (service as any).now = jest.fn(() => dayjs('2025-11-07T12:00:00Z'));

    prismaMock.jobApplication.findMany.mockResolvedValue([]);
    prismaMock.outreach.findMany.mockResolvedValue([]);
    prismaMock.followUp.findMany.mockResolvedValue([]);
    prismaMock.job.groupBy.mockResolvedValue([]);

    const summary = await service.getWeeklySummary(10);
    expect(summary.range).toBe(7);
    expect(summary.series.cvsSent).toHaveLength(7);
    expect(summary.degraded).toBe(false);
  });
});
