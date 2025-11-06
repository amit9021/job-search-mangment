import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JobStage, Prisma, ReferralKind } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { InferDto } from '../../utils/create-zod-dto';
import { ContactsService } from '../contacts/contacts.service';
import { FollowupsService } from '../followups/followups.service';
import { OutreachService } from '../outreach/outreach.service';

import { CreateJobDto, AddApplicationDto, UpdateJobStageDto } from './dto';
import { CreateJobOutreachInput } from './dto/create-job-outreach.dto';
import { loadHeatRules, HeatRules } from './heat-rules.loader';

type HeatBreakdownCategory =
  | 'stage'
  | 'referral'
  | 'outreach'
  | 'contact'
  | 'channel'
  | 'personalization'
  | 'tailoring'
  | 'decay'
  | 'clamp';

type HeatBreakdownItem = {
  category: HeatBreakdownCategory;
  label: string;
  value: number;
  rawValue?: number;
  maxValue?: number;
  note?: string;
};

type HeatComputationResult = {
  jobId: string;
  stage: JobStage;
  score: number;
  heat: number;
  breakdown: HeatBreakdownItem[];
  decayFactor: number;
  daysSinceLastTouch: number;
  lastTouchAt: Date;
  capApplied?: string;
  stageBase: number;
};

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly followupsService: FollowupsService,
    private readonly outreachService: OutreachService,
    private readonly contactsService: ContactsService
  ) {}

  async list(
    filters: {
      stage?: JobStage;
      heat?: number;
      includeArchived?: boolean;
      query?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    const { stage, heat, includeArchived, query, page, pageSize } = filters;

    const where: Prisma.JobWhereInput = {
      ...(includeArchived ? {} : { archived: false })
    };

    if (stage) {
      where.stage = stage;
    }

    if (heat !== undefined) {
      where.heat = heat;
    }

    if (query && query.trim().length > 0) {
      const term = query.trim();
      where.OR = [
        { company: { contains: term, mode: 'insensitive' } },
        { role: { contains: term, mode: 'insensitive' } }
      ];
    }

    const normalizedPageSize = pageSize && pageSize > 0 ? Math.min(pageSize, 200) : undefined;
    const normalizedPage = page && page > 0 ? page : 1;
    const skip = normalizedPageSize ? (normalizedPage - 1) * normalizedPageSize : undefined;

    const jobs = await this.prisma.job.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        companyRef: true
      },
      ...(normalizedPageSize ? { take: normalizedPageSize } : {}),
      ...(skip ? { skip } : {})
    });

    const metrics = await this.computeJobMetrics(jobs.map((job) => job.id));

    return jobs.map((job) => {
      const metric = metrics.get(job.id);
      return {
        ...job,
        contactsCount: metric?.contactsCount ?? 0,
        contacts: metric?.contacts ?? [],
        nextFollowUpAt: metric?.nextFollowUpAt ?? null
      };
    });
  }

  async getById(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        companyRef: true // Use the relation field, not the scalar 'company' field
      }
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    const metrics = await this.computeJobMetrics([job.id]);
    const metric = metrics.get(job.id);
    return {
      ...job,
      contactsCount: metric?.contactsCount ?? 0,
      contacts: metric?.contacts ?? [],
      nextFollowUpAt: metric?.nextFollowUpAt ?? null
    };
  }

  async create(data: InferDto<typeof CreateJobDto>) {
    const createdJob = await this.prisma.$transaction(async (tx) => {
      const stage = data.stage ?? JobStage.APPLIED;
      const job = await tx.job.create({
        data: {
          company: data.company,
          role: data.role,
          sourceUrl: data.sourceUrl ?? null,
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

  async update(
    jobId: string,
    data: {
      company?: string;
      role?: string;
      sourceUrl?: string | null;
      companyId?: string | null;
    }
  ) {
    await this.ensureJobExists(jobId);

    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        ...(data.company !== undefined && { company: data.company }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.sourceUrl !== undefined && { sourceUrl: data.sourceUrl }),
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

    const [job, history] = await this.prisma.$transaction(async (tx) => {
      const updatedJob = await tx.job.update({
        where: { id: jobId },
        data: {
          stage: dto.stage,
          lastTouchAt: new Date(),
          updatedAt: new Date()
        }
      });

      const historyEntry = await tx.jobStatusHistory.create({
        data: {
          jobId,
          stage: dto.stage,
          note: dto.note ?? null
        }
      });

      return [updatedJob, historyEntry] as const;
    });

    if (dto.stage === JobStage.DORMANT) {
      await this.followupsService.markDormantForJob(jobId);
    }

    await this.recalculateHeat(jobId);
    const metrics = await this.computeJobMetrics([jobId]);
    const metric = metrics.get(jobId);
    return {
      job: {
        ...job,
        contactsCount: metric?.contactsCount ?? 0,
        contacts: metric?.contacts ?? [],
        nextFollowUpAt: metric?.nextFollowUpAt ?? null
      },
      history
    };
  }

  async recordJobOutreach(jobId: string, payload: CreateJobOutreachInput) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    let contactId = payload.contactId ?? null;
    if (!contactId && payload.contactCreate) {
      const createdContact = await this.contactsService.create({
        name: payload.contactCreate.name,
        role: payload.contactCreate.role ?? undefined,
        email: payload.contactCreate.email ?? undefined,
        linkedinUrl: payload.contactCreate.linkedinUrl ?? undefined,
        companyName: payload.contactCreate.companyName ?? job.company
      });
      contactId = createdContact.id;
    }

    const personalizationScore = Math.min(100, Math.max(0, payload.personalizationScore ?? 70));

    const outreach = await this.outreachService.createJobOutreach(jobId, {
      contactId: contactId ?? undefined,
      channel: payload.channel,
      messageType: payload.messageType,
      personalizationScore,
      outcome: payload.outcome,
      content: payload.content,
      context: payload.context,
      createFollowUp: payload.createFollowUp,
      followUpNote: payload.followUpNote
    });

    await this.touchJob(jobId);
    await this.recalculateHeat(jobId);

    const nextJobSnapshot = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { companyRef: true }
    });
    if (!nextJobSnapshot) {
      throw new NotFoundException('Job not found');
    }
    const metrics = await this.computeJobMetrics([jobId]);
    const metric = metrics.get(jobId);

    this.logger.log(
      `job.outreach recorded jobId=${jobId} outreachId=${outreach.id} contactId=${outreach.contactId ?? 'none'}`
    );

    return {
      outreach,
      job: {
        ...nextJobSnapshot,
        contactsCount: metric?.contactsCount ?? 0,
        contacts: metric?.contacts ?? [],
        nextFollowUpAt: metric?.nextFollowUpAt ?? null
      }
    };
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
          orderBy: { dueAt: 'asc' },
          include: {
            contact: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
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

  private async computeJobMetrics(jobIds: string[]) {
    const metrics = new Map<
      string,
      {
        contactsCount: number;
        contacts: Array<{ id: string; name: string | null; role: string | null }>;
        nextFollowUpAt: Date | null;
      }
    >();
    if (jobIds.length === 0) {
      return metrics;
    }

    const [outreachLinks, followups] = await Promise.all([
      this.prisma.outreach.findMany({
        where: {
          jobId: { in: jobIds },
          contactId: { not: null }
        },
        select: { jobId: true, contactId: true }
      }),
      this.prisma.followUp.findMany({
        where: {
          jobId: { in: jobIds },
          sentAt: null
        },
        orderBy: { dueAt: 'asc' },
        select: { jobId: true, dueAt: true }
      })
    ]);

    const contactSets = new Map<string, Set<string>>();
    outreachLinks.forEach(({ jobId, contactId }) => {
      if (!jobId || !contactId) {
        return;
      }
      if (!contactSets.has(jobId)) {
        contactSets.set(jobId, new Set<string>());
      }
      contactSets.get(jobId)!.add(contactId);
    });

    const allContactIds = Array.from(
      new Set(
        outreachLinks
          .map(({ contactId }) => contactId)
          .filter((value): value is string => typeof value === 'string')
      )
    );

    const contacts = allContactIds.length
      ? await this.prisma.contact.findMany({
          where: { id: { in: allContactIds } },
          select: { id: true, name: true, role: true }
        })
      : [];

    const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));

    const followupMap = new Map<string, Date>();
    followups.forEach(({ jobId, dueAt }) => {
      if (!jobId) {
        return;
      }
      const current = followupMap.get(jobId);
      if (!current || dueAt < current) {
        followupMap.set(jobId, dueAt);
      }
    });

    jobIds.forEach((id) => {
      const contactSet = contactSets.get(id);
      const contactList = contactSet
        ? Array.from(contactSet)
            .map((contactId) => contactMap.get(contactId))
            .filter((value): value is NonNullable<typeof value> => Boolean(value))
        : [];

      metrics.set(id, {
        contactsCount: contactList.length,
        contacts: contactList,
        nextFollowUpAt: followupMap.get(id) ?? null
      });
    });

    return metrics;
  }

  async recalculateHeat(jobId: string) {
    const result = await this.computeHeatResult(jobId);
    await this.setHeat(jobId, result.heat);
  }

  async getHeatExplanation(jobId: string) {
    return this.computeHeatResult(jobId);
  }

  private async computeHeatResult(
    jobId: string,
    rules: HeatRules = loadHeatRules()
  ): Promise<HeatComputationResult> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        outreaches: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          include: {
            contact: {
              select: { id: true, name: true, strength: true }
            }
          }
        },
        applications: {
          orderBy: { dateSent: 'desc' },
          take: 1,
          select: { id: true, tailoringScore: true, dateSent: true }
        },
        referrals: {
          where: {
            kind: { in: [ReferralKind.REFERRAL, ReferralKind.SENT_CV] }
          },
          orderBy: { at: 'desc' },
          take: 1,
          select: { id: true, kind: true }
        }
      }
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.archived) {
      const archivedScore = rules.caps.archived ?? 0;
      return {
        jobId,
        stage: job.stage,
        score: this.round(archivedScore, 0),
        heat: 0,
        breakdown: [
          {
            category: 'clamp',
            label: 'Archived',
            value: this.round(archivedScore),
            rawValue: this.round(archivedScore),
            maxValue: this.round(archivedScore),
            note: 'Archived jobs remain cold by design'
          }
        ],
        decayFactor: 0,
        daysSinceLastTouch: 0,
        lastTouchAt: job.lastTouchAt,
        capApplied: 'archived',
        stageBase: 0
      };
    }

    const latestOutreach = job.outreaches[0] ?? null;
    const latestApplication = job.applications[0] ?? null;
    const referral = job.referrals[0] ?? null;

    const breakdown: HeatBreakdownItem[] = [];
    const stageBase = rules.stageBase[job.stage] ?? 0;
    const stageCap = rules.caps.stage?.[job.stage];
    const stageMax = typeof stageCap === 'number' ? stageCap : 100;
    breakdown.push({
      category: 'stage',
      label: `Stage (${job.stage.toLowerCase()})`,
      value: this.round(stageBase),
      rawValue: this.round(stageBase),
      maxValue: this.round(stageMax),
      note:
        typeof stageCap === 'number'
          ? `Baseline for stage; capped at ${this.round(stageCap)}`
          : 'Baseline score for current stage'
    });

    const dynamicComponents: Array<{
      category: HeatBreakdownCategory;
      label: string;
      raw: number;
      maxRaw?: number;
      note?: string;
    }> = [];

    if (referral) {
      dynamicComponents.push({
        category: 'referral',
        label: 'Referral',
        raw: rules.referral.score,
        note: `Active ${referral.kind.toLowerCase()}`
      });
    } else if (latestOutreach) {
      const outcomeScore = rules.outreachOutcome[latestOutreach.outcome] ?? 0;
      if (outcomeScore !== 0) {
        dynamicComponents.push({
          category: 'outreach',
          label: `Outcome (${latestOutreach.outcome.toLowerCase()})`,
          raw: outcomeScore,
          note: `Sent ${latestOutreach.sentAt.toISOString()}`
        });
      }

      const strengthKey = (latestOutreach.contact?.strength ?? 'UNKNOWN') as string;
      const strengthScore = rules.contactStrength[strengthKey] ?? 0;
      if (strengthScore !== 0) {
        dynamicComponents.push({
          category: 'contact',
          label: `Contact strength (${strengthKey.toLowerCase()})`,
          raw: strengthScore,
          note: latestOutreach.contact?.name ? `Contact ${latestOutreach.contact.name}` : undefined
        });
      }

      const channelScore = rules.channel[latestOutreach.channel] ?? 0;
      if (channelScore !== 0) {
        dynamicComponents.push({
          category: 'channel',
          label: `Channel (${latestOutreach.channel.toLowerCase()})`,
          raw: channelScore,
          note: 'Relative weight by channel'
        });
      }
    }

    if (
      latestOutreach?.personalizationScore !== null &&
      latestOutreach?.personalizationScore !== undefined
    ) {
      const personalizationRaw =
        latestOutreach.personalizationScore / Math.max(1, rules.personalizationDivisor);
      if (personalizationRaw !== 0) {
        dynamicComponents.push({
          category: 'personalization',
          label: 'Personalization',
          raw: personalizationRaw,
          maxRaw: 100 / Math.max(1, rules.personalizationDivisor),
          note: `${latestOutreach.personalizationScore} ÷ ${rules.personalizationDivisor}`
        });
      }
    }

    if (
      latestApplication?.tailoringScore !== null &&
      latestApplication?.tailoringScore !== undefined
    ) {
      const tailoringRaw = latestApplication.tailoringScore / Math.max(1, rules.tailoringDivisor);
      if (tailoringRaw !== 0) {
        dynamicComponents.push({
          category: 'tailoring',
          label: 'Tailoring',
          raw: tailoringRaw,
          maxRaw: 100 / Math.max(1, rules.tailoringDivisor),
          note: `${latestApplication.tailoringScore} ÷ ${rules.tailoringDivisor}`
        });
      }
    }

    const lastTouchAt = job.lastTouchAt ?? job.updatedAt ?? job.createdAt;
    const daysSinceLastTouch = Math.max(
      0,
      (Date.now() - lastTouchAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const halfLife = rules.decay.halfLifeDays > 0 ? rules.decay.halfLifeDays : 7;
    const effectiveDays =
      rules.decay.maximumDays && rules.decay.maximumDays > 0
        ? Math.min(daysSinceLastTouch, rules.decay.maximumDays)
        : daysSinceLastTouch;

    let decayFactor = Math.pow(0.5, effectiveDays / halfLife);
    if (rules.decay.minimumFactor !== undefined) {
      decayFactor = Math.max(decayFactor, rules.decay.minimumFactor);
    }

    let dynamicDecayedTotal = 0;
    dynamicComponents.forEach((component) => {
      const decayedValue = component.raw * decayFactor;
      dynamicDecayedTotal += decayedValue;
      const rounded = this.round(decayedValue);
      const maxValue = this.round(component.maxRaw ?? component.raw);
      const noteSegments = [component.note];
      if (decayFactor !== 1) {
        noteSegments.push(`Recency ×${this.round(decayFactor, 2)}`);
      }

      breakdown.push({
        category: component.category,
        label: component.label,
        value: rounded,
        rawValue: this.round(component.raw),
        maxValue,
        note: noteSegments.filter(Boolean).join(' · ')
      });
    });

    breakdown.push({
      category: 'decay',
      label: 'Recency factor',
      value: this.round(decayFactor, 2),
      rawValue: this.round(decayFactor, 2),
      maxValue: 1,
      note: `${this.round(daysSinceLastTouch, 1)} days since last touch · half-life ${halfLife}d`
    });

    const rawTotalBeforeClamp = stageBase + dynamicDecayedTotal;
    let finalScore = rawTotalBeforeClamp;
    let capApplied: string | undefined;

    if (typeof stageCap === 'number' && finalScore > stageCap) {
      finalScore = stageCap;
      capApplied = `stage:${job.stage}`;
    }

    if (finalScore > 100) {
      finalScore = 100;
      capApplied = capApplied ?? 'global:100';
    }

    if (finalScore < 0) {
      finalScore = 0;
      capApplied = capApplied ?? 'global:0';
    }

    const clampAdjustment = this.round(finalScore - rawTotalBeforeClamp);
    if (clampAdjustment !== 0) {
      breakdown.push({
        category: 'clamp',
        label: 'Cap adjustment',
        value: clampAdjustment,
        rawValue: clampAdjustment,
        maxValue: clampAdjustment,
        note: capApplied
      });
    }

    const roundedScore = Math.round(finalScore);
    const buckets = [...(rules.heatBuckets ?? [])].sort((a, b) => a.maxScore - b.maxScore);
    let heat = 0;
    for (const bucket of buckets) {
      if (roundedScore <= bucket.maxScore) {
        heat = bucket.heat;
        break;
      }
    }
    if (buckets.length === 0) {
      heat = Math.min(3, Math.max(0, Math.floor(roundedScore / 25)));
    } else if (roundedScore > buckets[buckets.length - 1].maxScore) {
      heat = buckets[buckets.length - 1].heat;
    }

    return {
      jobId,
      stage: job.stage,
      score: roundedScore,
      heat,
      breakdown,
      decayFactor: this.round(decayFactor, 2),
      daysSinceLastTouch: this.round(daysSinceLastTouch, 1),
      lastTouchAt,
      capApplied,
      stageBase: this.round(stageBase)
    };
  }

  private async setHeat(jobId: string, heat: number) {
    await this.prisma.job.update({
      where: { id: jobId },
      data: { heat, updatedAt: new Date() }
    });
  }

  private round(value: number, decimals = 2) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  async getPipelineSummary() {
    const stages = await this.prisma.job.groupBy({
      by: ['stage'],
      _count: { _all: true }
    });
    return stages;
  }
}
