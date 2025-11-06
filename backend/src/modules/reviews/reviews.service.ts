import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

type CreateReviewParams = {
  contactId: string;
  projectId: string;
  summary?: string;
  qualityScore?: number;
};

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.codeReview.findMany({
      orderBy: { requestedAt: 'desc' },
      include: { contact: true, project: true }
    });
  }

  async createForContact(contactId: string, params: Omit<CreateReviewParams, 'contactId'>) {
    return this.create({ contactId, ...params });
  }

  async create(params: CreateReviewParams) {
    const contact = await this.prisma.contact.findUnique({ where: { id: params.contactId } });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    const project = await this.prisma.project.findUnique({ where: { id: params.projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const review = await this.prisma.codeReview.create({
      data: {
        contactId: params.contactId,
        projectId: params.projectId,
        summary: params.summary ?? null,
        qualityScore: params.qualityScore ?? null,
        reviewedAt: params.qualityScore !== undefined ? new Date() : null
      },
      include: { contact: true, project: true }
    });

    if (contact.strength === 'WEAK') {
      await this.prisma.contact.update({
        where: { id: contact.id },
        data: { strength: 'MEDIUM' }
      });
    }

    return review;
  }
}
