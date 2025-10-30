import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; domain?: string; linkedinUrl?: string }) {
    // Check if company with this name already exists
    const existing = await this.prisma.company.findFirst({
      where: { name: { equals: data.name, mode: 'insensitive' } }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.company.create({
      data: {
        name: data.name,
        domain: data.domain || null,
        linkedinUrl: data.linkedinUrl || null
      }
    });
  }

  async list(query?: string) {
    return this.prisma.company.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { domain: { contains: query, mode: 'insensitive' } }
            ]
          }
        : undefined,
      orderBy: { name: 'asc' },
      take: 50
    });
  }

  async findById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            contacts: true,
            jobs: true
          }
        }
      }
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return company;
  }

  async update(id: string, data: { name?: string; domain?: string; linkedinUrl?: string }) {
    await this.findById(id); // Ensure exists

    return this.prisma.company.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.domain !== undefined && { domain: data.domain || null }),
        ...(data.linkedinUrl !== undefined && { linkedinUrl: data.linkedinUrl || null })
      }
    });
  }

  async findOrCreate(name: string) {
    const existing = await this.prisma.company.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existing) {
      return existing;
    }

    return this.create({ name });
  }
}
