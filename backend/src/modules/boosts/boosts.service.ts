import { Injectable, NotFoundException } from '@nestjs/common';
import dayjs from '../../utils/dayjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BoostsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.boostTask.findMany({
      orderBy: [
        { doneAt: 'asc' },
        { impactScore: 'desc' }
      ]
    });
  }

  async create(data: { title: string; impactScore: number }) {
    return this.prisma.boostTask.create({
      data: {
        title: data.title,
        impactScore: data.impactScore
      }
    });
  }

  async complete(id: string) {
    const task = await this.prisma.boostTask.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Boost task not found');
    }
    return this.prisma.boostTask.update({
      where: { id },
      data: { doneAt: dayjs().toDate() }
    });
  }

  async reopen(id: string) {
    return this.prisma.boostTask.update({
      where: { id },
      data: { doneAt: null }
    });
  }

  async delete(id: string) {
    return this.prisma.boostTask.delete({ where: { id } });
  }
}
