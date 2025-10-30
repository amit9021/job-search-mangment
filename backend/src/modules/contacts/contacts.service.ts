import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactStrength } from '@prisma/client';
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
    page?: number;
    pageSize?: number;
  }) {
    const { query, strength, companyId, page = 1, pageSize = 50 } = params || {};

    const where: any = {};

    if (strength) {
      where.strength = strength;
    }

    if (companyId) {
      where.companyId = companyId;
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
          take: 1
        }
      }
    });

    // Compute lastTouchAt from latest outreach
    return contacts.map(contact => ({
      ...contact,
      lastTouchAt: contact.outreaches[0]?.sentAt ?? contact.createdAt
    }));
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
        strength: data.strength ?? ContactStrength.WEAK
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
          take: 20
        },
        reviews: {
          orderBy: { requestedAt: 'desc' },
          take: 20,
          include: { project: true }
        }
      }
    });
    if (!contact) {
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
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20);

    return {
      ...contact,
      timeline
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
