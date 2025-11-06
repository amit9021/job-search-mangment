import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactStrength } from '@prisma/client';
import { differenceInCalendarDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { CompaniesService } from '../companies/companies.service';


@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companiesService: CompaniesService
  ) {}

  async list(params?: {
    query?: string;
    strength?: ContactStrength;
    companyId?: string;
    includeArchived?: boolean;
    page?: number;
    pageSize?: number;
    tags?: string[];
    lastTouch?: '7d' | '30d' | 'stale' | 'never';
  }) {
    const {
      query,
      strength,
      companyId,
      includeArchived = false,
      page = 1,
      pageSize = 50,
      tags,
      lastTouch
    } = params || {};

    const where: any = {
      ...(includeArchived ? {} : { archived: false })
    };

    if (strength) {
      where.strength = strength;
    }

    if (companyId) {
      where.companyId = companyId;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasEvery: tags };
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { role: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { linkedinUrl: { contains: query, mode: 'insensitive' } },
        { githubUrl: { contains: query, mode: 'insensitive' } }
      ];
    }

    const contacts = await this.prisma.contact.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        company: true,
        outreaches: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          include: {
            job: {
              select: { id: true, company: true, role: true, stage: true }
            }
          }
        },
        followups: {
          where: { sentAt: null },
          orderBy: { dueAt: 'asc' },
          take: 1,
          include: {
            job: {
              select: { id: true, company: true, role: true, stage: true }
            }
          }
        }
      }
    });

    const contactIds: string[] = contacts.map((contact) => contact.id);

    const outreachLinks = contactIds.length
      ? await this.prisma.outreach.findMany({
          where: {
            contactId: { in: contactIds },
            jobId: { not: null }
          },
          select: {
            contactId: true,
            job: {
              select: { id: true, company: true, role: true, stage: true }
            }
          }
        })
      : [];

    const referralLinks = contactIds.length
      ? await this.prisma.referral.findMany({
          where: {
            contactId: { in: contactIds },
            jobId: { not: null }
          },
          select: {
            contactId: true,
            job: {
              select: { id: true, company: true, role: true, stage: true }
            }
          }
        })
      : [];

    const linkedJobsByContact = new Map<
      string | null,
      Map<string, { id: string; company: string | null; role: string | null; stage: string }>
    >();

    const upsertJob = (
      contactId: string | null,
      job:
        | {
            id: string;
            company: string;
            role: string | null;
            stage: string;
          }
        | null
        | undefined
    ) => {
      if (!job) {
        return;
      }
      if (!linkedJobsByContact.has(contactId)) {
        linkedJobsByContact.set(contactId, new Map());
      }
      linkedJobsByContact.get(contactId)!.set(job.id, job);
    };

    outreachLinks.forEach((link) => {
      upsertJob(link.contactId, link.job);
    });
    referralLinks.forEach((link) => {
      upsertJob(link.contactId, link.job);
    });

    const computed = contacts.map((contact) => {
      const linkedJobs = Array.from(linkedJobsByContact.get(contact.id)?.values() ?? []).sort((a, b) => {
        const labelA = `${a.company ?? ''} ${a.role ?? ''}`;
        const labelB = `${b.company ?? ''} ${b.role ?? ''}`;
        return labelA.localeCompare(labelB);
      });
      const lastTouchFromOutreach = contact.outreaches[0]?.sentAt ?? null;
      const nextFollowUp = contact.followups[0];
      const nextFollowUpAt = nextFollowUp?.dueAt ?? null;
      const lastTouchAt = lastTouchFromOutreach ?? contact.createdAt;
      const engagement = this.computeEngagement({
        lastTouch: lastTouchFromOutreach,
        createdAt: contact.createdAt,
        nextFollowUp: nextFollowUpAt,
        strength: contact.strength
      });

      return {
        ...contact,
        linkedJobs,
        lastTouchAt,
        nextFollowUpAt,
        hadOutreach: contact.outreaches.length > 0,
        engagement
      };
    });

    const filtered = lastTouch
      ? computed.filter((entry) =>
          this.matchesLastTouch(lastTouch, entry.lastTouchAt, entry.hadOutreach)
        )
      : computed;

    return filtered.map((entry) => {
      const { hadOutreach, ...rest } = entry;
      return rest;
    });
  }

  private computeEngagement(params: {
    lastTouch: Date | null;
    createdAt: Date;
    nextFollowUp: Date | null;
    strength: ContactStrength;
  }) {
    const now = new Date();
    const reference = params.lastTouch ?? params.createdAt;
    let score = 0;

    if (reference) {
      const daysAgo = Math.max(0, differenceInCalendarDays(now, reference));
      if (daysAgo <= 2) {
        score = 90;
      } else if (daysAgo <= 7) {
        score = 75;
      } else if (daysAgo <= 21) {
        score = 55;
      } else {
        score = 20;
      }
    }

    if (params.nextFollowUp) {
      const daysUntil = differenceInCalendarDays(params.nextFollowUp, now);
      if (daysUntil <= 0) {
        score = Math.max(score, 85);
      } else if (daysUntil <= 3) {
        score = Math.max(score, 65);
      }
    }

    if (params.strength === 'STRONG') {
      score = Math.max(score, 65);
    } else if (params.strength === 'MEDIUM') {
      score = Math.max(score, 45);
    }

    const level = score >= 75 ? 'hot' : score >= 45 ? 'warm' : 'cold';

    return {
      level,
      score,
      updatedAt: reference ? reference.toISOString() : undefined
    };
  }

  private matchesLastTouch(
    filter: '7d' | '30d' | 'stale' | 'never',
    lastTouchAt: Date | null,
    hadOutreach: boolean
  ) {
    if (filter === 'never') {
      return !hadOutreach;
    }

    if (!lastTouchAt) {
      return filter === 'stale';
    }

    const now = new Date();
    const daysAgo = Math.max(0, differenceInCalendarDays(now, lastTouchAt));

    if (filter === '7d') {
      return daysAgo <= 7;
    }
    if (filter === '30d') {
      return daysAgo <= 30;
    }
    return daysAgo > 30;
  }

  async create(data: {
    name: string;
    companyId?: string;
    companyName?: string;
    role?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    location?: string;
    tags?: string[];
    notes?: string;
    strength?: ContactStrength;
  }) {
    // Auto-create company if companyName provided
    let finalCompanyId = data.companyId;
    if (data.companyName && !finalCompanyId) {
      const company = await this.companiesService.findOrCreate(data.companyName);
      finalCompanyId = company.id;
    }

    return this.prisma.contact.create({
      data: {
        name: data.name,
        companyId: finalCompanyId ?? null,
        role: data.role ?? null,
        email: data.email || null,
        phone: data.phone || null,
        linkedinUrl: data.linkedinUrl || null,
        githubUrl: data.githubUrl || null,
        location: data.location ?? null,
        tags: data.tags ?? [],
        notes: data.notes ?? null,
        strength: data.strength ?? ContactStrength.WEAK,
        archived: false
      },
      include: {
        company: true
      }
    });
  }

  async getById(contactId: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        company: true,
        referrals: {
          orderBy: { at: 'desc' },
          take: 20,
          include: { job: true }
        },
        outreaches: {
          orderBy: { sentAt: 'desc' },
          take: 20,
          include: {
            job: {
              select: {
                id: true,
                company: true,
                role: true,
                stage: true
              }
            }
          }
        },
        reviews: {
          orderBy: { requestedAt: 'desc' },
          take: 20,
          include: { project: true }
        },
        followups: {
          orderBy: { dueAt: 'desc' },
          include: {
            job: {
              select: {
                id: true,
                company: true,
                role: true,
                stage: true
              }
            }
          }
        }
      }
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    if (contact.archived) {
      throw new NotFoundException('Contact not found');
    }

    // Build unified timeline
    const timeline = [
      ...contact.outreaches.map((o: any) => ({
        type: 'outreach' as const,
        date: o.sentAt,
        data: o
      })),
      ...contact.referrals.map((r: any) => ({
        type: 'referral' as const,
        date: r.at,
        data: r
      })),
      ...contact.reviews.map((r: any) => ({
        type: 'review' as const,
        date: r.requestedAt,
        data: r
      })),
      ...contact.followups.map((f: any) => ({
        type: 'followup' as const,
        date: f.dueAt,
        data: f
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20);

    const linkedJobsMap = new Map<
      string,
      { id: string; company: string; role: string | null; stage: string }
    >();

    contact.outreaches.forEach((outreach: any) => {
      const job = outreach.job;
      if (job && !linkedJobsMap.has(job.id)) {
        linkedJobsMap.set(job.id, {
          id: job.id,
          company: job.company,
          role: job.role,
          stage: job.stage
        });
      }
    });

    contact.referrals.forEach((referral: any) => {
      const job = referral.job;
      if (job && !linkedJobsMap.has(job.id)) {
        linkedJobsMap.set(job.id, {
          id: job.id,
          company: job.company,
          role: job.role,
          stage: job.stage
        });
      }
    });

    const linkedJobs = Array.from(linkedJobsMap.values()).sort((a, b) =>
      `${a.company} ${a.role ?? ''}`.localeCompare(`${b.company} ${b.role ?? ''}`)
    );
    const lastTouchFromOutreach = contact.outreaches[0]?.sentAt ?? null;
    const nextFollowUp = contact.followups.find((followup: any) => followup.sentAt === null) ?? contact.followups[0] ?? null;
    const nextFollowUpAt = nextFollowUp?.dueAt ?? null;
    const engagement = this.computeEngagement({
      lastTouch: lastTouchFromOutreach,
      createdAt: contact.createdAt,
      nextFollowUp: nextFollowUpAt,
      strength: contact.strength
    });

    return {
      ...contact,
      timeline,
      linkedJobs,
      lastTouchAt: lastTouchFromOutreach ?? contact.createdAt,
      nextFollowUpAt,
      engagement
    };
  }

  async getEngagementSummary(contactId: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        outreaches: {
          orderBy: { sentAt: 'desc' },
          take: 1
        },
        followups: {
          where: { sentAt: null },
          orderBy: { dueAt: 'asc' },
          take: 1
        }
      }
    });
    if (!contact || contact.archived) {
      throw new NotFoundException('Contact not found');
    }

    const lastTouch = contact.outreaches[0]?.sentAt ?? null;
    const nextFollowUpAt = contact.followups[0]?.dueAt ?? null;
    const engagement = this.computeEngagement({
      lastTouch,
      createdAt: contact.createdAt,
      nextFollowUp: nextFollowUpAt,
      strength: contact.strength
    });

    return {
      lastTouchAt: (lastTouch ?? contact.createdAt).toISOString(),
      nextFollowUpAt: nextFollowUpAt ? nextFollowUpAt.toISOString() : null,
      engagement
    };
  }

  async update(
    contactId: string,
    data: {
      name?: string;
      companyId?: string | null;
      companyName?: string;
      role?: string | null;
      email?: string | null;
      phone?: string | null;
      linkedinUrl?: string | null;
      githubUrl?: string | null;
      location?: string | null;
      tags?: string[];
      notes?: string | null;
      strength?: ContactStrength;
    }
  ) {
    // Auto-create company if companyName provided
    let finalCompanyId = data.companyId;
    if (data.companyName && finalCompanyId === undefined) {
      const company = await this.companiesService.findOrCreate(data.companyName);
      finalCompanyId = company.id;
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (finalCompanyId !== undefined) updateData.companyId = finalCompanyId;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.linkedinUrl !== undefined) updateData.linkedinUrl = data.linkedinUrl || null;
    if (data.githubUrl !== undefined) updateData.githubUrl = data.githubUrl || null;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.strength !== undefined) updateData.strength = data.strength;

    return this.prisma.contact.update({
      where: { id: contactId },
      data: updateData,
      include: {
        company: true
      }
    });
  }

  async delete(contactId: string, options: { hard?: boolean } = {}) {
    if (options.hard) {
      await this.prisma.$transaction(async (tx) => {
        await tx.followUp.updateMany({
          where: { contactId },
          data: { contactId: null }
        });
        await tx.notification.updateMany({
          where: { contactId },
          data: { contactId: null }
        });
        await tx.outreach.updateMany({
          where: { contactId },
          data: { contactId: null }
        });
        await tx.referral.deleteMany({ where: { contactId } });
        await tx.codeReview.deleteMany({ where: { contactId } });
        await tx.eventContact.deleteMany({ where: { contactId } });
        await tx.contact.delete({ where: { id: contactId } });
      });
      return { success: true, hardDeleted: true };
    }

    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    if (contact.archived) {
      return { success: true, archived: true };
    }

    await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        archived: true,
        archivedAt: new Date()
      }
    });

    await this.prisma.followUp.updateMany({
      where: { contactId, sentAt: null },
      data: { note: 'Contact archived' }
    });

    return { success: true, archived: true };
  }

  async promoteStrength(contactId: string, strength: ContactStrength) {
    const strengthOrder: ContactStrength[] = ['WEAK', 'MEDIUM', 'STRONG'];
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    if (strengthOrder.indexOf(strength) > strengthOrder.indexOf(contact.strength)) {
      await this.prisma.contact.update({
        where: { id: contactId },
        data: { strength }
      });
    }
  }

  async listNetworkStars() {
    return this.prisma.contact.findMany({
      where: {
        archived: false,
        referrals: {
          some: {}
        }
      },
      orderBy: {
        referrals: {
          _count: 'desc'
        }
      },
      take: 5,
      include: {
        referrals: true
      }
    });
  }
}
