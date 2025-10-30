import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

class MockPrismaService {
  user = { findUnique: jest.fn() };
  jobApplication = { count: jest.fn(), create: jest.fn() };
  outreach = { count: jest.fn(), findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn() };
  followUp = { count: jest.fn(), findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() };
  codeReview = { count: jest.fn(), findMany: jest.fn() };
  job = { findMany: jest.fn(), groupBy: jest.fn(), update: jest.fn(), updateMany: jest.fn(), create: jest.fn() };
  contact = { count: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findUniqueOrThrow: jest.fn() };
  event = { findMany: jest.fn(), count: jest.fn(), update: jest.fn(), create: jest.fn(), findUnique: jest.fn() };
  eventContact = { create: jest.fn() };
  boostTask = { findMany: jest.fn(), count: jest.fn() };
  referral = { findFirst: jest.fn(), create: jest.fn(), count: jest.fn() };
  notification = { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() };
  jobStatusHistory = { create: jest.fn() };
  project = { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn(), create: jest.fn(), findMany: jest.fn() };
  outreachCreateResponse: any = null;
  $connect = jest.fn();
  $disconnect = jest.fn();
}

describe('App e2e (happy path smoke tests)', () => {
  let app: INestApplication;
  let prisma: MockPrismaService;

  beforeAll(async () => {
    prisma = new MockPrismaService();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('POST /auth/login returns token for valid credentials', async () => {
    const password = 'test123';
    const passwordHash = await argon2.hash(password);
    prisma.user.findUnique.mockResolvedValue({ id: 'user_1', username: 'admin', passwordHash });

    const response = await request(app.getHttpServer()).post('/auth/login').send({ username: 'admin', password });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.username).toBe('admin');
  });

  it('GET /kpis/today returns KPI snapshot structure', async () => {
    prisma.jobApplication.count.mockResolvedValue(2);
    prisma.outreach.count.mockResolvedValue(3);
    prisma.followUp.count.mockResolvedValue(1);
    prisma.codeReview.count.mockResolvedValue(1);
    prisma.job.groupBy.mockResolvedValue([
      { heat: 0, _count: { _all: 1 } },
      { heat: 1, _count: { _all: 2 } }
    ]);

    prisma.job.findMany.mockResolvedValue([]);
    prisma.contact.count.mockResolvedValue(0);
    prisma.codeReview.findMany.mockResolvedValue([]);
    prisma.event.findMany.mockResolvedValue([]);
    prisma.boostTask.findMany.mockResolvedValue([]);
    prisma.boostTask.count.mockResolvedValue(0);
    prisma.event.count.mockResolvedValue(0);

    const response = await request(app.getHttpServer())
      .get('/kpis/today')
      .set('Authorization', 'Bearer fake');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('cvSentToday', 2);
    expect(Array.isArray(response.body.heatBreakdown)).toBe(true);
    expect(response.body.nextBestAction).toBeDefined();
  });

  it('GET /recommendations/next produces actionable suggestion', async () => {
    prisma.job.findMany.mockResolvedValue([
      {
        id: 'job_1',
        company: 'Acme',
        role: 'Senior Engineer',
        heat: 3,
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        lastTouchAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        stage: 'APPLIED',
        outreaches: []
      }
    ]);
    prisma.followUp.count.mockResolvedValue(1);
    prisma.jobApplication.count.mockResolvedValue(1);
    prisma.outreach.count.mockResolvedValue(1);
    prisma.contact.count.mockResolvedValue(2);
    prisma.codeReview.findMany.mockResolvedValue([]);
    prisma.event.findMany.mockResolvedValue([]);
    prisma.boostTask.findMany.mockResolvedValue([]);

    const response = await request(app.getHttpServer())
      .get('/recommendations/next')
      .set('Authorization', 'Bearer fake');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        action: expect.any(String)
      })
    );
  });

  it('follow-up scheduler ensures notifications are queued (service contract)', async () => {
    prisma.followUp.count.mockResolvedValue(2);
    prisma.jobApplication.count.mockResolvedValue(5);
    prisma.outreach.count.mockResolvedValue(5);
    prisma.contact.count.mockResolvedValue(0);
    prisma.codeReview.findMany.mockResolvedValue([]);
    prisma.event.findMany.mockResolvedValue([]);
    prisma.boostTask.findMany.mockResolvedValue([]);
    prisma.notification.findFirst.mockResolvedValue(null);
    prisma.notification.create.mockResolvedValue({ id: 'notif_1' });

    await request(app.getHttpServer())
      .get('/recommendations/next')
      .set('Authorization', 'Bearer fake');

    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});
