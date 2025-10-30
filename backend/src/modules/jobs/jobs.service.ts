import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JobStage, OutreachOutcome, Prisma, ReferralKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FollowupsService } from '../followups/followups.service';
import { OutreachService } from '../outreach/outreach.service';
import {
  CreateJobDto,
  AddApplicationDto,
  UpdateJobStageDto
} from './dto';
import { CreateJobOutreachInput } from './dto/create-job-outreach.dto';
import { InferDto } from '../../utils/create-zod-dto';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly followupsService: FollowupsService,
    private readonly outreachService: OutreachService
  ) {}

  async list(filters: { stage?: JobStage; heat?: number; includeArchived?: boolean } = {}) {
    const { stage, heat, includeArchived } = filters;
    const jobs = await this.prisma.job.findMany({
      where: {
        ...(includeArchived ? {} : { archived: false }),
        ...(stage ? { stage } : {}),
        ...(heat !== undefined ? { heat } : {})
      },
      orderBy: [{ updatedAt: 'desc' }]
    });
    return jobs;
  }

  async getById(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        companyRef: true  // Use the relation field, not the scalar 'company' field
      }
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async create(data: InferDto<typeof CreateJobDto>) {
    const createdJob = await this.prisma.$transaction(async (tx) => {
      const stage = data.stage ?? JobStage.APPLIED;
      const job = await tx.job.create({
        data: {
          company: data.company,
          role: data.role,
          sourceUrl: data.sourceUrl ?? null,
          deadline: data.deadline ? new Date(data.deadline) : null,
          heat: data.heat ?? 0,
          stage
        }
      });

      await tx.jobStatusHistory.create({
        data: {
          jobId: job.id,
          stage,
          note: 'Job created'
        }
      });

      if (data.initialApplication) {
        const sentAt = data.initialApplication.dateSent
          ? new Date(data.initialApplication.dateSent)
          : new Date();
        await tx.jobApplication.create({
          data: {
            jobId: job.id,
            dateSent: sentAt,
            tailoringScore: data.initialApplication.tailoringScore,
            cvVersionId: data.initialApplication.cvVersionId ?? null
          }
        });

        await tx.job.update({
          where: { id: job.id },
          data: { lastTouchAt: sentAt }
        });
      }

      return job;
    });

    if (data.initialOutreach) {
      await this.recordJobOutreach(createdJob.id, data.initialOutreach);
    } else {
      await this.recalculateHeat(createdJob.id);
    }

    this.logger.log(
      `job.create success jobId=${createdJob.id} company=${createdJob.company} initialApplication=${Boolean(data.initialApplication)} initialOutreach=${Boolean(data.initialOutreach)}`
    );

    return this.getById(createdJob.id);
  }

  async update(jobId: string, data: {
    company?: string;
    role?: string;
    sourceUrl?: string | null;
    deadline?: string | null;
    companyId?: string | null;
  }) {
    await this.ensureJobExists(jobId);

    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        ...(data.company !== undefined && { company: data.company }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.sourceUrl !== undefined && { sourceUrl: data.sourceUrl }),
        ...(data.deadline !== undefined && {
          deadline: data.deadline ? new Date(data.deadline) : null
        }),
        ...(data.companyId !== undefined && { companyId: data.companyId }),
        updatedAt: new Date()
      }
    });

    return job;
  }

  async delete(jobId: string, options: { hard?: boolean } = {}) {
    await this.ensureJobExists(jobId);

    if (!options.hard) {
      await this.prisma.$transaction(async (tx) => {
        await tx.job.update({
          where: { id: jobId },
          data: {
            stage: JobStage.DORMANT,
            archived: true,
            archivedAt: new Date()
          }
        });

        await tx.jobStatusHistory.create({
          data: {
            jobId,
            stage: JobStage.DORMANT,
            note: 'Job archived'
          }
        });
      });

      await this.followupsService.markDormantForJob(jobId);
      await this.recalculateHeat(jobId);

      this.logger.log(`job.delete soft jobId=${jobId}`);
      return { success: true, archived: true };
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.followUp.deleteMany({ where: { jobId } });
        await tx.notification.deleteMany({ where: { jobId } });
        await tx.outreach.deleteMany({ where: { jobId } });
        await tx.jobApplication.deleteMany({ where: { jobId } });
        await tx.jobStatusHistory.deleteMany({ where: { jobId } });
        await tx.referral.updateMany({
          where: { jobId },
          data: { jobId: null }
        });
        await tx.job.delete({ where: { id: jobId } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Unable to delete job because related records reference it');
      }
      throw error;
    }

    this.logger.log(`job.delete hard jobId=${jobId}`);
    return { success: true, hardDeleted: true };
  }

  async addApplication(jobId: string, dto: InferDto<typeof AddApplicationDto>) {
    await this.ensureJobExists(jobId);
    const application = await this.prisma.jobApplication.create({
      data: {
        jobId,
        dateSent: new Date(dto.dateSent),
        tailoringScore: dto.tailoringScore,
        cvVersionId: dto.cvVersionId ?? null
      }
    });

    await this.touchJob(jobId);
    await this.recalculateHeat(jobId);
    return application;
  }

  async updateStatus(jobId: string, dto: InferDto<typeof UpdateJobStageDto>) {
    await this.ensureJobExists(jobId);

    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        stage: dto.stage,
        lastTouchAt: new Date(),
        updatedAt: new Date()
      }
    });

    await this.prisma.jobStatusHistory.create({
      data: {
        jobId,
        stage: dto.stage,
        note: dto.note ?? null
      }
    });

    if (dto.stage === JobStage.DORMANT) {
      await this.followupsService.markDormantForJob(jobId);
    }

    await this.recalculateHeat(jobId);
    return job;
  }

  async recordJobOutreach(jobId: string, payload: CreateJobOutreachInput) {
    await this.ensureJobExists(jobId);
    const outreach = await this.outreachService.createJobOutreach(jobId, payload);
    await this.touchJob(jobId);
    await this.recalculateHeat(jobId);
    this.logger.log(`job.outreach recorded jobId=${jobId} outreachId=${outreach.id}`);
    return outreach;
  }

  async getHistory(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        applications: true,
        statusHistory: {
          orderBy: { at: 'asc' }
        },
        outreaches: {
          orderBy: { sentAt: 'asc' },
          include: { contact: true }
        },
        followups: {
          orderBy: { dueAt: 'asc' }
        }
      }
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  private async ensureJobExists(jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
  }

  private async touchJob(jobId: string) {
    await this.prisma.job.update({
      where: { id: jobId },
      data: { lastTouchAt: new Date() }
    });
  }

  async recalculateHeat(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { archived: true }
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.archived) {
      await this.setHeat(jobId, 0);
      return;
    }

    const referral = await this.prisma.referral.findFirst({
      where: {
        jobId,
        kind: { in: [ReferralKind.REFERRAL, ReferralKind.SENT_CV] }
      }
    });
    if (referral) {
      await this.setHeat(jobId, 3);
      return;
    }

    const warmOutreach = await this.prisma.outreach.findFirst({
      where: {
        jobId,
        outcome: OutreachOutcome.POSITIVE
      },
      include: {
        contact: true
      }
    });

    if (warmOutreach?.contact) {
      const strength = warmOutreach.contact.strength;
      if (strength === 'STRONG' || strength === 'MEDIUM') {
        await this.setHeat(jobId, 2);
      } else {
        await this.setHeat(jobId, 1);
      }
      return;
    }

    const anyResponse = await this.prisma.outreach.count({
      where: {
        jobId,
        outcome: { in: [OutreachOutcome.POSITIVE, OutreachOutcome.NEGATIVE] }
      }
    });
    if (anyResponse > 0) {
      await this.setHeat(jobId, 1);
      return;
    }

    await this.setHeat(jobId, 0);
  }

  private async setHeat(jobId: string, heat: number) {
    await this.prisma.job.update({
      where: { id: jobId },
      data: { heat, updatedAt: new Date() }
    });
  }

  async getPipelineSummary() {
    const stages = await this.prisma.job.groupBy({
      by: ['stage'],
      _count: { _all: true }
    });
    return stages;
  }
}
