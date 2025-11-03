import { Injectable, NotFoundException } from '@nestjs/common';
import dayjs from '../../utils/dayjs';
import { PrismaService } from '../../prisma/prisma.service';
import { InferDto } from '../../utils/create-zod-dto';
import {
  CreateGrowthReviewDto,
  CreateGrowthEventDto,
  CreateGrowthBoostTaskDto,
  UpdateGrowthBoostTaskDto,
  CreateProjectHighlightDto,
  UpdateProjectHighlightDto
} from './dto';
import { BoostSuggestion, suggestBoostTasks } from './boost-recommender';

type CreateReviewInput = InferDto<typeof CreateGrowthReviewDto>;
type CreateEventInput = InferDto<typeof CreateGrowthEventDto>;
type CreateBoostTaskInput = InferDto<typeof CreateGrowthBoostTaskDto>;
type UpdateBoostTaskInput = InferDto<typeof UpdateGrowthBoostTaskDto>;
type CreateProjectHighlightInput = InferDto<typeof CreateProjectHighlightDto>;
type UpdateProjectHighlightInput = InferDto<typeof UpdateProjectHighlightDto>;

@Injectable()
export class GrowService {
  constructor(private readonly prisma: PrismaService) {}

  async listReviews() {
    return this.prisma.growthReview.findMany({
      orderBy: { reviewedAt: 'desc' },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            role: true,
            company: { select: { id: true, name: true } }
          }
        }
      }
    });
  }

  async createReview(dto: CreateReviewInput) {
    const contact = await this.prisma.contact.findUnique({ where: { id: dto.reviewerId } });
    if (!contact) {
      throw new NotFoundException('Reviewer contact not found');
    }

    return this.prisma.growthReview.create({
      data: {
        reviewerId: dto.reviewerId,
        projectName: dto.projectName,
        summary: dto.summary,
        score: dto.score,
        takeaways: dto.takeaways?.trim()?.length ? dto.takeaways.trim() : null
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            role: true,
            company: { select: { id: true, name: true } }
          }
        }
      }
    });
  }

  async listEvents() {
    return this.prisma.growthEvent.findMany({
      orderBy: { date: 'desc' }
    });
  }

  async createEvent(dto: CreateEventInput) {
    return this.prisma.growthEvent.create({
      data: {
        name: dto.name,
        date: dto.date,
        location: dto.location ?? null,
        attended: dto.attended ?? false,
        notes: dto.notes ?? null,
        followUps: dto.followUps ?? []
      }
    });
  }

  async listBoostTasks() {
    return this.prisma.growthBoostTask.findMany({
      orderBy: [
        { status: 'asc' },
        { impactLevel: 'desc' },
        { createdAt: 'asc' }
      ]
    });
  }

  async createBoostTask(dto: CreateBoostTaskInput) {
    return this.prisma.growthBoostTask.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        category: dto.category,
        impactLevel: dto.impactLevel,
        tags: dto.tags ?? [],
        status: dto.status ?? 'pending',
        completedAt: dto.status === 'completed' ? new Date() : null
      }
    });
  }

  async updateBoostTask(id: string, dto: UpdateBoostTaskInput) {
    const boostTask = await this.ensureBoostTask(id);

    const status = dto.status ?? boostTask.status;
    return this.prisma.growthBoostTask.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description ?? null }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.impactLevel !== undefined && { impactLevel: dto.impactLevel }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        status,
        completedAt: status === 'completed' ? boostTask.completedAt ?? new Date() : null
      }
    });
  }

  async listProjectHighlights() {
    return this.prisma.projectHighlight.findMany({
      orderBy: [
        { spotlight: 'desc' },
        { published: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async createProjectHighlight(dto: CreateProjectHighlightInput) {
    return this.prisma.projectHighlight.create({
      data: {
        projectName: dto.projectName,
        platformUrl: dto.platformUrl ?? null,
        spotlight: dto.spotlight ?? false,
        plannedPost: dto.plannedPost ?? null,
        published: dto.published ?? false,
        publishedAt: dto.published
          ? dto.publishedAt ?? new Date()
          : null
      }
    });
  }

  async updateProjectHighlight(id: string, dto: UpdateProjectHighlightInput) {
    await this.ensureProjectHighlight(id);
    const published = dto.published;

    return this.prisma.projectHighlight.update({
      where: { id },
      data: {
        ...(dto.projectName !== undefined && { projectName: dto.projectName }),
        ...(dto.platformUrl !== undefined && { platformUrl: dto.platformUrl ?? null }),
        ...(dto.spotlight !== undefined && { spotlight: dto.spotlight }),
        ...(dto.plannedPost !== undefined && { plannedPost: dto.plannedPost ?? null }),
        ...(published !== undefined && { published }),
        ...(dto.publishedAt !== undefined && { publishedAt: dto.publishedAt }),
        ...(published === false && { publishedAt: null }),
        ...(published === true && dto.publishedAt === undefined && { publishedAt: new Date() })
      }
    });
  }

  async suggestBoostTasks(): Promise<BoostSuggestion[]> {
    const [projects, recentOutreachCount, eventsAttended, boostsCompleted, highlightsPublished, activeBoosts] = await Promise.all([
      this.prisma.project.findMany({ select: { stack: true } }),
      this.prisma.outreach.count({
        where: {
          sentAt: {
            gte: dayjs().subtract(7, 'day').toDate()
          }
        }
      }),
      this.prisma.growthEvent.count({
        where: {
          attended: true,
          date: {
            gte: dayjs().subtract(30, 'day').startOf('day').toDate()
          }
        }
      }),
      this.prisma.growthBoostTask.count({
        where: {
          status: 'completed',
          completedAt: {
            gte: dayjs().subtract(30, 'day').startOf('day').toDate()
          }
        }
      }),
      this.prisma.projectHighlight.count({
        where: {
          published: true,
          publishedAt: {
            gte: dayjs().subtract(30, 'day').startOf('day').toDate()
          }
        }
      }),
      this.prisma.growthBoostTask.findMany({
        where: { status: { in: ['pending', 'in-progress'] } },
        select: { title: true, category: true }
      })
    ]);

    const userStack = this.extractUserStack(projects.map((project) => project.stack));
    const marketTrends = this.getMarketTrends();
    const activityStats = {
      outreach7d: recentOutreachCount,
      eventsAttended30d: eventsAttended,
      boostsCompleted30d: boostsCompleted,
      highlightsPublished30d: highlightsPublished
    };

    return suggestBoostTasks(userStack, marketTrends, activityStats, activeBoosts);
  }

  private async ensureBoostTask(id: string) {
    const boostTask = await this.prisma.growthBoostTask.findUnique({ where: { id } });
    if (!boostTask) {
      throw new NotFoundException('Boost task not found');
    }
    return boostTask;
  }

  private async ensureProjectHighlight(id: string) {
    const highlight = await this.prisma.projectHighlight.findUnique({ where: { id } });
    if (!highlight) {
      throw new NotFoundException('Project highlight not found');
    }
    return highlight;
  }

  private extractUserStack(stackValues: Array<string | null>): string[] {
    const techs = new Set<string>();
    for (const value of stackValues) {
      if (!value) continue;
      value
        .split(/[,/|+&]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .forEach((item) => techs.add(item.toLowerCase()));
    }
    return Array.from(techs);
  }

  private getMarketTrends(): string[] {
    return [
      'TypeScript',
      'GraphQL',
      'Edge Functions',
      'Serverless',
      'AI-assisted Development',
      'Rust'
    ];
  }
}
