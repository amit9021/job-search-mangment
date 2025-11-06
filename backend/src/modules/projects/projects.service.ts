import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

type CreateProjectParams = {
  name: string;
  repoUrl: string;
  stack?: string;
  spotlight?: boolean;
};

type UpdateProjectParams = Partial<CreateProjectParams>;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.project.findMany({
      orderBy: [{ spotlight: 'desc' }, { createdAt: 'desc' }]
    });
  }

  async create(params: CreateProjectParams) {
    const project = await this.prisma.project.create({
      data: {
        name: params.name,
        repoUrl: params.repoUrl,
        stack: params.stack ?? null,
        spotlight: params.spotlight ?? false
      }
    });

    if (project.spotlight) {
      await this.ensureSingleSpotlight(project.id);
    }

    return project;
  }

  async update(id: string, params: UpdateProjectParams) {
    const data: Record<string, unknown> = {};
    if (params.name !== undefined) data.name = params.name;
    if (params.repoUrl !== undefined) data.repoUrl = params.repoUrl;
    if (params.stack !== undefined) data.stack = params.stack;
    if (params.spotlight !== undefined) data.spotlight = params.spotlight;

    const project = await this.prisma.project.update({
      where: { id },
      data
    });

    if (params.spotlight) {
      await this.ensureSingleSpotlight(project.id);
    }

    return project;
  }

  async toggleSpotlight(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const updated = await this.prisma.project.update({
      where: { id },
      data: { spotlight: !project.spotlight }
    });
    if (updated.spotlight) {
      await this.ensureSingleSpotlight(id);
    }
    return updated;
  }

  async delete(id: string) {
    return this.prisma.project.delete({ where: { id } });
  }

  private async ensureSingleSpotlight(id: string) {
    await this.prisma.project.updateMany({
      where: { id: { not: id } },
      data: { spotlight: false }
    });
  }
}
