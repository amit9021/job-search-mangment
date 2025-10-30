import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStage, OutreachOutcome, ReferralKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FollowupsService } from '../followups/followups.service';
import { OutreachService } from '../outreach/outreach.service';
import {
  CreateJobDto,
  AddApplicationDto,
  UpdateJobStageDto
} from './dto';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly followupsService: FollowupsService,
    private readonly outreachService: OutreachService
  ) {}

  async list(stage?: JobStage, heat?: number) {
    const jobs = await this.prisma.job.findMany({
      where: {
        ...(stage ? { stage } : {}),
        ...(heat !== undefined ? { heat } : {})
      },
      orderBy: [{ updatedAt: 'desc' }]
    });
    return jobs;
  }

  async create(data: CreateJobDto) {
    const job = await this.prisma.job.create({
      data: {
        company: data.company,
        role: data.role,
        sourceUrl: data.sourceUrl,
        deadline: data.deadline ? new Date(data.deadline) : null,
        heat: data.heat ?? 0,
        stage: JobStage.APPLIED
      }
    });

    await this.prisma.jobStatusHistory.create({
      data: {
        jobId: job.id,
        stage: JobStage.APPLIED,
        note: 'Job created'
      }
    });

    // Create initial application if provided
    if (data.initialApplication) {
      await this.prisma.jobApplication.create({
        data: {
          jobId: job.id,
          dateSent: data.initialApplication.dateSent
            ? new Date(data.initialApplication.dateSent)
            : new Date(),
          tailoringScore: data.initialApplication.tailoringScore,
          cvVersionId: data.initialApplication.cvVersionId ?? null
        }
      });
    }

    return job;
  }

  async addApplication(jobId: string, dto: AddApplicationDto) {
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

  async updateStatus(jobId: string, dto: UpdateJobStageDto) {
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

  async recordJobOutreach(jobId: string, payload: Parameters<OutreachService['createJobOutreach']>[1]) {
    await this.ensureJobExists(jobId);
    const outreach = await this.outreachService.createJobOutreach(jobId, payload);
    await this.touchJob(jobId);
    await this.recalculateHeat(jobId);
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
