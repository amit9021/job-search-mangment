import dayjs from '../../utils/dayjs';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let prisma: any;
  let service: TasksService;

  beforeEach(() => {
    prisma = {
      task: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn()
      },
      contact: {
        findUnique: jest.fn()
      },
      job: {
        findUnique: jest.fn()
      }
    };

    service = new TasksService(prisma);
  });

  it('creates automation follow-up when outcome missing', async () => {
    prisma.contact.findUnique.mockResolvedValue({ id: 'contact_1', name: 'Dana' });
    prisma.job.findUnique.mockResolvedValue({ id: 'job_1', company: 'Acme', role: 'AE' });
    prisma.task.create.mockResolvedValue({ id: 'task_1' });
    jest.spyOn(service as any, 'now').mockReturnValue(dayjs('2025-01-01T10:00:00Z'));

    const result = await service.handleOutreachAutomation({
      outreachId: 'outreach_1',
      contactId: 'contact_1',
      jobId: 'job_1',
      outcome: 'NONE'
    });

    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Follow up with Dana @ Acme',
          source: 'Rule',
          tags: ['followup']
        })
      })
    );
    expect(result).toEqual({ created: true, taskId: 'task_1' });
  });

  it('skips automation when outcome resolved', async () => {
    const result = await service.handleOutreachAutomation({
      outreachId: 'outreach_1',
      outcome: 'POSITIVE'
    });

    expect(result.created).toBe(false);
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it('aggregates KPI metrics and streak', async () => {
    prisma.task.count
      .mockResolvedValueOnce(5) // due today
      .mockResolvedValueOnce(2) // overdue
      .mockResolvedValueOnce(4); // velocity
    prisma.task.findMany.mockResolvedValue([
      { completedAt: new Date('2025-01-10T09:00:00Z') },
      { completedAt: new Date('2025-01-09T15:00:00Z') },
      { completedAt: new Date('2025-01-07T15:00:00Z') }
    ]);
    jest.spyOn(service as any, 'now').mockReturnValue(dayjs('2025-01-10T12:00:00Z'));

    const result = await service.getKpis();

    expect(result).toEqual({
      dueToday: 5,
      overdue: 2,
      velocity7d: 4,
      streak: 2
    });
  });
});
