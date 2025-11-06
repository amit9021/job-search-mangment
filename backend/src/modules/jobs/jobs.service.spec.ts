import { ConflictException } from '@nestjs/common';
import { JobStage, Prisma, ReferralKind } from '@prisma/client';

import { setHeatRules } from './heat-rules.loader';
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
    findMany: jest.Mock;
    deleteMany: jest.Mock;
    findFirst: jest.Mock;
  };
  followUp: {
    findMany: jest.Mock;
    deleteMany: jest.Mock;
    updateMany: jest.Mock;
  };
  contact: {
    findMany: jest.Mock;
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
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
      findFirst: jest.fn()
    },
    followUp: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
      updateMany: jest.fn()
    },
    contact: {
      findMany: jest.fn().mockResolvedValue([])
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
  let contacts: { create: jest.Mock };
  let service: JobsService;
  let recalcSpy: jest.SpyInstance;

  beforeEach(() => {
    prisma = createPrismaMock();
    followups = { markDormantForJob: jest.fn() };
    outreach = { createJobOutreach: jest.fn().mockResolvedValue({ id: 'outreach_1' }) };
    contacts = { create: jest.fn().mockResolvedValue({ id: 'contact_1', name: 'Jane' }) };
    service = new JobsService(
      prisma as unknown as any,
      followups as any,
      outreach as any,
      contacts as any
    );
    recalcSpy = jest.spyOn(service, 'recalculateHeat').mockResolvedValue();
    jest
      .spyOn(service as unknown as { touchJob: (id: string) => Promise<void> }, 'touchJob')
      .mockResolvedValue();
  });

  afterEach(() => {
    setHeatRules(null);
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('creates a job with default stage and logs history', async () => {
      prisma.job.create.mockResolvedValue({
        id: 'job_1',
        company: 'Acme',
        role: 'Engineer',
        stage: JobStage.APPLIED,
        heat: 0
      });
      prisma.jobStatusHistory.create.mockResolvedValue({ id: 'hist_1' });
      prisma.job.findUnique.mockResolvedValue({
        id: 'job_1',
        company: 'Acme',
        role: 'Engineer',
        stage: JobStage.APPLIED,
        heat: 0,
        archived: false
      });

      const result = await service.create({ company: 'Acme', role: 'Engineer' } as any);

      expect(prisma.job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            company: 'Acme',
            role: 'Engineer',
            stage: JobStage.APPLIED
          })
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
      prisma.job.create.mockResolvedValue({
        id: 'job_2',
        company: 'Globex',
        role: 'PM',
        stage: JobStage.APPLIED,
        heat: 0
      });
      prisma.jobStatusHistory.create.mockResolvedValue({ id: 'hist_2' });
      prisma.jobApplication.create.mockResolvedValue({ id: 'app_1' });
      prisma.job.update.mockResolvedValue({ id: 'job_2' });
      prisma.job.findUnique.mockResolvedValue({
        id: 'job_2',
        company: 'Globex',
        role: 'PM',
        stage: JobStage.APPLIED,
        heat: 0,
        archived: false
      });
      const outreachSpy = jest
        .spyOn(service, 'recordJobOutreach')
        .mockResolvedValue({ id: 'outreach_1' } as any);

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

      expect(prisma.jobApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tailoringScore: 75 }) })
      );
      expect(prisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'job_2' } })
      );
      expect(outreachSpy).toHaveBeenCalledWith(
        'job_2',
        expect.objectContaining({ channel: 'EMAIL' })
      );
    });
  });

  describe('recordJobOutreach', () => {
    it('returns job snapshot including linked contacts', async () => {
      prisma.job.findUnique
        .mockResolvedValueOnce({
          id: 'job_link',
          company: 'Acme',
          role: 'Engineer',
          stage: JobStage.APPLIED,
          heat: 1
        })
        .mockResolvedValueOnce({
          id: 'job_link',
          company: 'Acme',
          role: 'Engineer',
          stage: JobStage.APPLIED,
          heat: 1,
          archived: false
        });

      const outreachResponse = {
        id: 'outreach_1',
        contactId: 'contact_42',
        contact: { id: 'contact_42', name: 'Jane Doe' }
      };
      outreach.createJobOutreach.mockResolvedValue(outreachResponse);

      jest
        .spyOn(
          service as unknown as { computeJobMetrics: (ids: string[]) => Promise<Map<string, any>> },
          'computeJobMetrics'
        )
        .mockResolvedValue(
          new Map([
            [
              'job_link',
              {
                contactsCount: 1,
                contacts: [{ id: 'contact_42', name: 'Jane Doe', role: 'Recruiter' }],
                nextFollowUpAt: null
              }
            ]
          ])
        );

      const result = await service.recordJobOutreach('job_link', {
        contactId: 'contact_42',
        channel: 'EMAIL',
        messageType: 'intro_request',
        personalizationScore: 70
      } as any);

      expect(outreach.createJobOutreach).toHaveBeenCalledWith(
        'job_link',
        expect.objectContaining({ contactId: 'contact_42', channel: 'EMAIL' })
      );
      expect(result.job.contactsCount).toBe(1);
      expect(result.job.contacts[0]).toEqual(
        expect.objectContaining({ id: 'contact_42', name: 'Jane Doe', role: 'Recruiter' })
      );
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
      const error = new Prisma.PrismaClientKnownRequestError('fail', {
        code: 'P2003',
        clientVersion: '5.22.0'
      });
      prisma.$transaction.mockRejectedValue(error);

      await expect(service.delete('job_del', { hard: true })).rejects.toBeInstanceOf(
        ConflictException
      );
    });
  });

  describe('heat computation', () => {
    const baseRules = {
      caps: { archived: 0, stage: {} },
      stageBase: {
        APPLIED: 30,
        HR: 40,
        TECH: 60,
        OFFER: 80,
        REJECTED: 10,
        DORMANT: 5
      },
      referral: { score: 45 },
      outreachOutcome: {
        POSITIVE: 20,
        NEGATIVE: -20,
        NO_RESPONSE: 8,
        NONE: 0
      },
      contactStrength: {
        STRONG: 15,
        MEDIUM: 10,
        WEAK: 5,
        UNKNOWN: 2
      },
      channel: {
        EMAIL: 10,
        LINKEDIN: 12,
        PHONE: 14,
        OTHER: 6
      },
      personalizationDivisor: 5,
      tailoringDivisor: 4,
      decay: {
        halfLifeDays: 7,
        minimumFactor: 0.25,
        maximumDays: 30
      },
      heatBuckets: [
        { maxScore: 24, heat: 0 },
        { maxScore: 49, heat: 1 },
        { maxScore: 74, heat: 2 },
        { maxScore: 100, heat: 3 }
      ]
    };

    beforeEach(() => {
      recalcSpy.mockRestore();
      prisma.job.update.mockClear();
      prisma.job.update.mockResolvedValue({});
      setHeatRules(baseRules as any);
    });

    afterEach(() => {
      setHeatRules(null);
    });

    it('returns cold score for archived jobs', async () => {
      prisma.job.findUnique.mockResolvedValue({
        id: 'job_archived',
        stage: JobStage.APPLIED,
        archived: true,
        lastTouchAt: new Date(),
        updatedAt: new Date(),
        createdAt: new Date(),
        outreaches: [],
        applications: [],
        referrals: []
      });

      const result = await service.getHeatExplanation('job_archived');

      expect(result.heat).toBe(0);
      expect(result.score).toBe(0);
      expect(result.breakdown[0].category).toBe('clamp');
    });

    it('applies referral bonus when referral exists', async () => {
      prisma.job.findUnique.mockResolvedValue({
        id: 'job_ref',
        stage: JobStage.APPLIED,
        archived: false,
        lastTouchAt: new Date(),
        updatedAt: new Date(),
        createdAt: new Date(),
        outreaches: [],
        applications: [],
        referrals: [{ id: 'ref_1', kind: ReferralKind.REFERRAL }]
      });

      const result = await service.getHeatExplanation('job_ref');

      expect(result.score).toBeGreaterThanOrEqual(baseRules.stageBase.APPLIED);
      expect(result.breakdown.some((item) => item.category === 'referral')).toBe(true);
    });

    it('decays outreach contributions over time', async () => {
      const twentyOneDaysAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
      prisma.job.findUnique.mockResolvedValue({
        id: 'job_decay',
        stage: JobStage.APPLIED,
        archived: false,
        lastTouchAt: twentyOneDaysAgo,
        updatedAt: twentyOneDaysAgo,
        createdAt: twentyOneDaysAgo,
        outreaches: [
          {
            id: 'outreach_1',
            sentAt: twentyOneDaysAgo,
            outcome: 'POSITIVE',
            channel: 'EMAIL',
            personalizationScore: 80,
            contact: { id: 'contact_1', name: 'Jane', strength: 'STRONG' }
          }
        ],
        applications: [],
        referrals: []
      });

      const result = await service.getHeatExplanation('job_decay');

      expect(result.decayFactor).toBeLessThan(1);
      expect(result.breakdown.some((item) => item.category === 'outreach')).toBe(true);
    });

    it('recalculateHeat persists computed heat', async () => {
      const now = new Date();
      prisma.job.findUnique.mockResolvedValue({
        id: 'job_heat',
        stage: JobStage.APPLIED,
        archived: false,
        lastTouchAt: now,
        updatedAt: now,
        createdAt: now,
        outreaches: [],
        applications: [],
        referrals: []
      });

      await service.recalculateHeat('job_heat');

      expect(prisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job_heat' },
          data: expect.objectContaining({ heat: expect.any(Number) })
        })
      );
    });
  });
});
