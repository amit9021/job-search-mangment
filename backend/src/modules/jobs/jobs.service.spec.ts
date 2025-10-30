import { ConflictException } from '@nestjs/common';
import { JobStage, Prisma } from '@prisma/client';
import { JobsService } from './jobs.service';

type PrismaMock = {
  $transaction: jest.Mock;
  job: {
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findUnique: jest.Mock;
  };
  jobStatusHistory: {
    create: jest.Mock;
    deleteMany: jest.Mock;
  };
  jobApplication: {
    create: jest.Mock;
    deleteMany: jest.Mock;
  };
  outreach: {
    deleteMany: jest.Mock;
    findFirst: jest.Mock;
  };
  followUp: {
    deleteMany: jest.Mock;
    updateMany: jest.Mock;
  };
  notification: {
    deleteMany: jest.Mock;
  };
  referral: {
    updateMany: jest.Mock;
    findFirst: jest.Mock;
  };
};

const createPrismaMock = (): PrismaMock => {
  const prisma = {
    job: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn()
    },
    jobStatusHistory: {
      create: jest.fn(),
      deleteMany: jest.fn()
    },
    jobApplication: {
      create: jest.fn(),
      deleteMany: jest.fn()
    },
    outreach: {
      deleteMany: jest.fn(),
      findFirst: jest.fn()
    },
    followUp: {
      deleteMany: jest.fn(),
      updateMany: jest.fn()
    },
    notification: {
      deleteMany: jest.fn()
    },
    referral: {
      updateMany: jest.fn(),
      findFirst: jest.fn()
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) => callback(prisma))
  } as unknown as PrismaMock;

  return prisma;
};

describe('JobsService', () => {
  let prisma: PrismaMock;
  let followups: { markDormantForJob: jest.Mock };
  let outreach: { createJobOutreach: jest.Mock };
  let service: JobsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    followups = { markDormantForJob: jest.fn() };
    outreach = { createJobOutreach: jest.fn().mockResolvedValue({ id: 'outreach_1' }) };
    service = new JobsService(prisma as unknown as any, followups as any, outreach as any);
    jest.spyOn(service, 'recalculateHeat').mockResolvedValue();
    jest.spyOn(service as unknown as { touchJob: (id: string) => Promise<void> }, 'touchJob').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('creates a job with default stage and logs history', async () => {
      prisma.job.create.mockResolvedValue({ id: 'job_1', company: 'Acme', role: 'Engineer', stage: JobStage.APPLIED, heat: 0 });
      prisma.jobStatusHistory.create.mockResolvedValue({ id: 'hist_1' });
      prisma.job.findUnique.mockResolvedValue({ id: 'job_1', company: 'Acme', role: 'Engineer', stage: JobStage.APPLIED, heat: 0, archived: false });

      const result = await service.create({ company: 'Acme', role: 'Engineer' } as any);

      expect(prisma.job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ company: 'Acme', role: 'Engineer', stage: JobStage.APPLIED })
        })
      );
      expect(prisma.jobStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stage: JobStage.APPLIED })
        })
      );
      expect(service.recalculateHeat).toHaveBeenCalledWith('job_1');
      expect(result).toEqual(expect.objectContaining({ id: 'job_1', company: 'Acme' }));
    });

    it('creates related application and outreach when provided', async () => {
      prisma.job.create.mockResolvedValue({ id: 'job_2', company: 'Globex', role: 'PM', stage: JobStage.APPLIED, heat: 0 });
      prisma.jobStatusHistory.create.mockResolvedValue({ id: 'hist_2' });
      prisma.jobApplication.create.mockResolvedValue({ id: 'app_1' });
      prisma.job.update.mockResolvedValue({ id: 'job_2' });
      prisma.job.findUnique.mockResolvedValue({ id: 'job_2', company: 'Globex', role: 'PM', stage: JobStage.APPLIED, heat: 0, archived: false });
      const outreachSpy = jest.spyOn(service, 'recordJobOutreach').mockResolvedValue({ id: 'outreach_1' } as any);

      await service.create({
        company: 'Globex',
        role: 'PM',
        initialApplication: { tailoringScore: 75, dateSent: new Date().toISOString() },
        initialOutreach: {
          channel: 'EMAIL',
          messageType: 'intro',
          personalizationScore: 90
        }
      } as any);

      expect(prisma.jobApplication.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tailoringScore: 75 }) }));
      expect(prisma.job.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'job_2' } }));
      expect(outreachSpy).toHaveBeenCalledWith('job_2', expect.objectContaining({ channel: 'EMAIL' }));
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      prisma.job.findUnique.mockResolvedValue({ id: 'job_del', archived: false });
    });

    it('soft deletes by archiving and marking followups dormant', async () => {
      prisma.job.update.mockResolvedValue({ id: 'job_del' });
      prisma.jobStatusHistory.create.mockResolvedValue({ id: 'hist_soft' });

      const result = await service.delete('job_del');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job_del' },
          data: expect.objectContaining({ stage: JobStage.DORMANT, archived: true })
        })
      );
      expect(prisma.jobStatusHistory.create).toHaveBeenCalledWith(expect.any(Object));
      expect(followups.markDormantForJob).toHaveBeenCalledWith('job_del');
      expect(service.recalculateHeat).toHaveBeenCalledWith('job_del');
      expect(result).toEqual({ success: true, archived: true });
    });

    it('hard deletes and cascades related entities', async () => {
      prisma.followUp.deleteMany.mockResolvedValue({});
      prisma.notification.deleteMany.mockResolvedValue({});
      prisma.outreach.deleteMany.mockResolvedValue({});
      prisma.jobApplication.deleteMany.mockResolvedValue({});
      prisma.jobStatusHistory.deleteMany.mockResolvedValue({});
      prisma.referral.updateMany.mockResolvedValue({});
      prisma.job.delete.mockResolvedValue({});

      const result = await service.delete('job_del', { hard: true });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.followUp.deleteMany).toHaveBeenCalledWith({ where: { jobId: 'job_del' } });
      expect(prisma.job.delete).toHaveBeenCalledWith({ where: { id: 'job_del' } });
      expect(result).toEqual({ success: true, hardDeleted: true });
      expect(followups.markDormantForJob).not.toHaveBeenCalled();
    });

    it('throws ConflictException when hard delete violates FK constraints', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('fail', { code: 'P2003', clientVersion: '5.22.0' });
      prisma.$transaction.mockRejectedValue(error);

      await expect(service.delete('job_del', { hard: true })).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
