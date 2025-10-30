import { Injectable, NotFoundException } from '@nestjs/common';
import { ReferralKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';

type CreateReferralParams = {
  jobId?: string;
  kind: ReferralKind;
  note?: string;
};

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService, private readonly jobsService: JobsService) {}

  async list() {
    return this.prisma.referral.findMany({
      orderBy: { at: 'desc' },
      include: { contact: true, job: true }
    });
  }

  async createForContact(contactId: string, params: CreateReferralParams) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const referral = await this.prisma.referral.create({
      data: {
        contactId,
        jobId: params.jobId ?? null,
        kind: params.kind,
        note: params.note ?? null
      },
      include: { job: true, contact: true }
    });

    // Upgrade strength to STRONG
    if (contact.strength !== 'STRONG') {
      await this.prisma.contact.update({
        where: { id: contactId },
        data: { strength: 'STRONG' }
      });
    }

    if (params.jobId) {
      await this.jobsService.recalculateHeat(params.jobId);
    }

    return referral;
  }
}
