import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { FollowUpAppointmentMode, FollowUpType, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import dayjs from '../../utils/dayjs';
import { NotificationsService } from '../notifications/notifications.service';
import { InferDto } from '../../utils/create-zod-dto';
import { CreateFollowupDto } from './dto/create-followup.dto';
import { UpdateFollowupDto } from './dto/update-followup.dto';

type FollowupContext = {
  jobId?: string;
  contactId?: string;
  note?: string | null;
  type?: FollowUpType;
  appointmentMode?: FollowUpAppointmentMode | null;
};

@Injectable()
export class FollowupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  async getDue(filter: 'today' | 'overdue' | 'upcoming' = 'today') {
    const now = dayjs();
    const startOfDay = now.startOf('day').toDate();
    const endOfDay = now.endOf('day').toDate();
    let where;
    switch (filter) {
      case 'overdue':
        where = { dueAt: { lt: startOfDay }, sentAt: null };
        break;
      case 'upcoming':
        where = { dueAt: { gt: endOfDay }, sentAt: null };
        break;
      default:
        where = { dueAt: { gte: startOfDay, lte: endOfDay }, sentAt: null };
    }
    return this.prisma.followUp.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      include: { job: true, contact: true }
    });
  }

  async scheduleInitialFollowup(context: FollowupContext) {
    return this.createFollowup({
      ...context,
      attemptNo: 1,
      dueAt: dayjs().add(3, 'day').toDate()
    });
  }

  async createFollowup(
    params: FollowupContext & {
      attemptNo: 1 | 2;
      dueAt: Date;
      type?: FollowUpType;
      appointmentMode?: FollowUpAppointmentMode | null;
    }
  ) {
    const followup = await this.prisma.followUp.create({
      data: {
        jobId: params.jobId ?? null,
        contactId: params.contactId ?? null,
        note: params.note ?? null,
        attemptNo: params.attemptNo,
        dueAt: params.dueAt,
        type: params.type ?? FollowUpType.STANDARD,
        appointmentMode: params.appointmentMode ?? null
      }
    });
    await this.syncFollowupTask(followup.id);
    return followup;
  }

  async scheduleCustomFollowup(data: InferDto<typeof CreateFollowupDto>) {
    const dueAt = new Date(data.dueAt);
    if (Number.isNaN(dueAt.getTime())) {
      throw new BadRequestException('Invalid due date');
    }
    const followupType = data.type ?? FollowUpType.APPOINTMENT;
    const followup = await this.createFollowup({
      jobId: data.jobId,
      contactId: data.contactId,
      note: data.note ?? null,
      attemptNo: 1,
      dueAt,
      type: followupType,
      appointmentMode:
        followupType === FollowUpType.APPOINTMENT
          ? data.appointmentMode ?? FollowUpAppointmentMode.MEETING
          : null
    });
    return followup;
  }

  async updateFollowup(id: string, data: InferDto<typeof UpdateFollowupDto>) {
    const followup = await this.prisma.followUp.findUnique({ where: { id } });
    if (!followup) {
      throw new NotFoundException('Follow-up not found');
    }
    if (followup.sentAt) {
      throw new BadRequestException('Completed follow-ups cannot be changed');
    }
    const update: {
      dueAt?: Date;
      note?: string | null;
      contactId?: string | null;
      appointmentMode?: FollowUpAppointmentMode | null;
    } = {};
    if (data.dueAt) {
      const dueAt = new Date(data.dueAt);
      if (Number.isNaN(dueAt.getTime())) {
        throw new BadRequestException('Invalid due date');
      }
      update.dueAt = dueAt;
    }
    if (typeof data.note !== 'undefined') {
      update.note = data.note ?? null;
    }
    if (typeof data.contactId !== 'undefined') {
      update.contactId = data.contactId ?? null;
    }
    if (typeof data.appointmentMode !== 'undefined') {
      update.appointmentMode = data.appointmentMode ?? null;
    }
    const updated = await this.prisma.followUp.update({
      where: { id },
      data: update
    });
    await this.syncFollowupTask(updated.id);
    return updated;
  }

  async deleteFollowup(id: string) {
    const followup = await this.prisma.followUp.findUnique({ where: { id } });
    if (!followup) {
      throw new NotFoundException('Follow-up not found');
    }
    if (followup.sentAt) {
      throw new BadRequestException('Completed follow-ups cannot be deleted');
    }
    await this.prisma.followUp.delete({ where: { id } });
    await this.deleteFollowupTask(followup.id);
    return { deletedId: id };
  }

  private async syncFollowupTask(followUpId: string) {
    const followup = await this.prisma.followUp.findUnique({
      where: { id: followUpId },
      include: {
        job: { select: { id: true, company: true, role: true, userId: true } },
        contact: { select: { id: true, name: true } }
      }
    });
    if (!followup) {
      return;
    }
    const isAppointment = followup.type === FollowUpType.APPOINTMENT;
    const titleBase = isAppointment
      ? followup.appointmentMode && followup.appointmentMode !== 'OTHER'
        ? followup.appointmentMode.replace(/_/g, ' ').toLowerCase()
        : 'appointment'
      : `follow-up attempt ${followup.attemptNo}`;
    const titleCompany = followup.job?.company ? ` · ${followup.job.company}` : '';
    const title = `${titleBase.charAt(0).toUpperCase()}${titleBase.slice(1)}${titleCompany}`;
    const descriptionParts: string[] = [];
    if (followup.note) {
      descriptionParts.push(followup.note);
    }
    if (followup.contact?.name) {
      descriptionParts.push(`Contact: ${followup.contact.name}`);
    }
    const links: Record<string, string> = { followUpId };
    if (followup.jobId) {
      links.jobId = followup.jobId;
    }
    if (followup.contactId) {
      links.contactId = followup.contactId;
    }
    await this.prisma.task.upsert({
      where: { followUpId },
      create: {
        title,
        description: descriptionParts.length > 0 ? descriptionParts.join('\n') : null,
        dueAt: followup.dueAt,
        startAt: followup.dueAt,
        priority: isAppointment ? 'High' : 'Med',
        status: 'Todo',
        source: isAppointment ? 'Appointment' : 'Follow-up',
        links: links as Prisma.JsonObject,
        userId: followup.job?.userId ?? null,
        followUpId
      },
      update: {
        title,
        description: descriptionParts.length > 0 ? descriptionParts.join('\n') : null,
        dueAt: followup.dueAt,
        startAt: followup.dueAt,
        links: links as Prisma.JsonObject,
        userId: followup.job?.userId ?? null
      }
    });
  }

  private async deleteFollowupTask(followUpId: string) {
    await this.prisma.task.deleteMany({
      where: { followUpId }
    });
  }

  async cancelOpenForContext(params: { jobId?: string; contactId?: string }) {
    if (!params.jobId && !params.contactId) {
      return { count: 0 };
    }

    return this.prisma.followUp.deleteMany({
      where: {
        sentAt: null,
        ...(params.jobId ? { jobId: params.jobId } : {}),
        ...(params.contactId ? { contactId: params.contactId } : {})
      }
    });
  }

  async markSent(id: string, note?: string) {
    const followup = await this.prisma.followUp.findUnique({ where: { id } });
    if (!followup) {
      throw new NotFoundException('Follow-up not found');
    }

    const updated = await this.prisma.followUp.update({
      where: { id },
      data: { sentAt: new Date(), note: note ?? followup.note }
    });

    await this.deleteFollowupTask(followup.id);
    if (followup.type === FollowUpType.APPOINTMENT) {
      return updated;
    }
    if (followup.attemptNo === 1) {
      await this.createFollowup({
        jobId: followup.jobId ?? undefined,
        contactId: followup.contactId ?? undefined,
        attemptNo: 2,
        dueAt: dayjs().add(3, 'day').toDate()
      });
    } else if (followup.attemptNo === 2) {
      // Schedule dormancy check notification in 7 days
      await this.notificationsService.queueDormantCandidateCheck({
        jobId: followup.jobId ?? undefined,
        contactId: followup.contactId ?? undefined,
        dueAt: dayjs().add(7, 'day').toDate()
      });
    }

    return updated;
  }

  async markDormantForJob(jobId: string) {
    await this.prisma.followUp.updateMany({
      where: { jobId, sentAt: null },
      data: { note: 'Marked dormant' }
    });
  }
}
