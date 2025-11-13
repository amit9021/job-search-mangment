import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';

import { RequestContextService } from '../src/common/context/request-context.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';

type TaskRecord = {
  id: string;
  title: string;
  status: string;
  userId: string;
  description: string | null;
  priority: string;
  tags: string[];
  dueAt: Date | null;
  completedAt: Date | null;
  checklist: Array<{ text: string; done: boolean }>;
};

type UserRecord = {
  id: string;
  email: string;
};

class TenantAwarePrismaStub {
  public readonly task: {
    findUnique: (args: { where: { id: string } }) => Promise<TaskRecord | null>;
    update: (args: { where: { id: string }; data: Partial<TaskRecord> }) => Promise<TaskRecord>;
  };

  public readonly user: {
    findUnique: (args: { where: { id: string } }) => Promise<UserRecord | null>;
  };

  private readonly tasks = new Map<string, TaskRecord>();
  private readonly users = new Map<string, UserRecord>();

  constructor(private readonly requestContext: RequestContextService) {
    this.task = {
      findUnique: (args) => this.findTask(args.where.id),
      update: (args) => this.updateTask(args.where.id, args.data)
    };
    this.user = {
      findUnique: async ({ where: { id } }) => this.users.get(id) ?? null
    };
  }

  seedUsers(users: UserRecord[]) {
    users.forEach((user) => this.users.set(user.id, user));
  }

  seedTasks(tasks: TaskRecord[]) {
    tasks.forEach((task) => this.tasks.set(task.id, task));
  }

  enableShutdownHooks(_app: INestApplication) {
    return Promise.resolve();
  }

  private getCurrentUserId() {
    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('user context missing');
    }
    return userId;
  }

  private async findTask(id: string) {
    const task = this.tasks.get(id);
    if (!task) {
      return null;
    }
    const userId = this.getCurrentUserId();
    if (task.userId !== userId) {
      return null;
    }
    return { ...task };
  }

  private async updateTask(id: string, data: Partial<TaskRecord>) {
    const existing = await this.findTask(id);
    if (!existing) {
      throw new Error('Task not found');
    }
    const updated: TaskRecord = {
      ...existing,
      ...data
    };
    this.tasks.set(id, updated);
    return { ...updated };
  }
}

describe('User isolation (tasks)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let prismaStub: TenantAwarePrismaStub;
  let tokenUserA: string;
  let tokenUserB: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(PrismaService)
      .useFactory({
        inject: [RequestContextService],
        factory: (requestContext: RequestContextService) => {
          prismaStub = new TenantAwarePrismaStub(requestContext);
          return prismaStub as unknown as PrismaService;
        }
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    jwtService = app.get(JwtService);

    prismaStub.seedUsers([
      { id: 'userA', email: 'alpha@example.com' },
      { id: 'userB', email: 'bravo@example.com' }
    ]);

    prismaStub.seedTasks([
      {
        id: 'task_owned',
        title: 'Owned task',
        status: 'Todo',
        userId: 'userA',
        description: null,
        priority: 'Med',
        tags: [],
        dueAt: null,
        completedAt: null,
        checklist: []
      },
      {
        id: 'task_foreign',
        title: 'Foreign task',
        status: 'Todo',
        userId: 'userB',
        description: null,
        priority: 'Med',
        tags: [],
        dueAt: null,
        completedAt: null,
        checklist: []
      }
    ]);

    tokenUserA = await jwtService.signAsync({ sub: 'userA', email: 'alpha@example.com' });
    tokenUserB = await jwtService.signAsync({ sub: 'userB', email: 'bravo@example.com' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows the owner to update a task', async () => {
    const response = await request(app.getHttpServer())
      .patch('/tasks/task_owned')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ status: 'Done' })
      .expect(200);

    expect(response.body.status).toBe('Done');
  });

  it('returns 404 when attempting to update another user task', async () => {
    await request(app.getHttpServer())
      .patch('/tasks/task_foreign')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ status: 'Done' })
      .expect(404);
  });

  it('allows other users to manage their own tasks independently', async () => {
    const res = await request(app.getHttpServer())
      .patch('/tasks/task_foreign')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ status: 'Done' })
      .expect(200);
    expect(res.body.status).toBe('Done');
  });
});
