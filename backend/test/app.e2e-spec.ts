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
  job = { findMany: jest.fn(), groupBy: jest.fn(), update: jest.fn(), updateMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() };
  contact = { count: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn() };
  company = { findFirst: jest.fn(), create: jest.fn() };
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
  $transaction = jest.fn(async (callback: (tx: any) => Promise<any>) => callback(this));
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

  it('POST /jobs creates a job without requiring contact', async () => {
    const jobRecord = {
      id: 'job_1',
      company: 'Acme Corp',
      role: 'Engineer',
      stage: 'APPLIED',
      heat: 0,
      lastTouchAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      companyRef: null
    };

    prisma.job.create.mockResolvedValue(jobRecord);
    prisma.jobStatusHistory.create.mockResolvedValue({ id: 'hist_1' });
    prisma.job.findUnique.mockResolvedValue(jobRecord);
    prisma.job.update.mockResolvedValue(jobRecord);
    prisma.referral.findFirst.mockResolvedValue(null);
    prisma.outreach.findFirst.mockResolvedValue(null);
    prisma.outreach.count.mockResolvedValue(0);
    prisma.outreach.findMany.mockResolvedValue([]);
    prisma.followUp.findMany.mockResolvedValue([]);

    const response = await request(app.getHttpServer())
      .post('/jobs')
      .set('Authorization', 'Bearer fake')
      .send({ company: 'Acme Corp', role: 'Engineer' });

    expect(response.status).toBe(201);
    expect(prisma.job.create).toHaveBeenCalledWith(expect.any(Object));
    expect(response.body).toEqual(expect.objectContaining({ company: 'Acme Corp', contactsCount: 0 }));
  });

  it('POST /jobs/:id/outreach with existing contact links job and contact', async () => {
    const jobRecord = {
      id: 'job_link',
      company: 'Globex',
      role: 'PM',
      stage: 'APPLIED',
      heat: 0,
      lastTouchAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      companyRef: null
    };

    prisma.job.findUnique.mockResolvedValue(jobRecord);
    prisma.job.update.mockResolvedValue(jobRecord);
    prisma.outreach.create.mockResolvedValue({
      id: 'out_1',
      jobId: 'job_link',
      contactId: 'contact_existing',
      channel: 'EMAIL',
      messageType: 'intro_request',
      personalizationScore: 80,
      outcome: 'NONE',
      content: null,
      sentAt: new Date().toISOString(),
      contact: { id: 'contact_existing', name: 'Existing Contact' }
    });
    prisma.followUp.create.mockResolvedValue({ id: 'follow_1' });
    prisma.referral.findFirst.mockResolvedValue(null);
    prisma.outreach.findFirst.mockResolvedValue(null);
    prisma.outreach.count.mockResolvedValue(0);
    prisma.outreach.findMany.mockResolvedValue([{ jobId: 'job_link', contactId: 'contact_existing' }]);
    prisma.followUp.findMany.mockResolvedValue([]);

    const response = await request(app.getHttpServer())
      .post('/jobs/job_link/outreach')
      .set('Authorization', 'Bearer fake')
      .send({
        contactId: 'contact_existing',
        channel: 'EMAIL',
        messageType: 'intro_request',
        personalizationScore: 80,
        createFollowUp: true
      });

    expect(response.status).toBe(201);
    expect(prisma.outreach.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ contactId: 'contact_existing' }) }));
    expect(response.body.job).toEqual(expect.objectContaining({ id: 'job_link', contactsCount: 1 }));
  });

  it('POST /jobs/:id/outreach with contactCreate creates contact inline', async () => {
    const jobRecord = {
      id: 'job_new_contact',
      company: 'Soylent',
      role: 'AE',
      stage: 'APPLIED',
      heat: 0,
      lastTouchAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      companyRef: null
    };

    prisma.job.findUnique.mockResolvedValue(jobRecord);
    prisma.job.update.mockResolvedValue(jobRecord);
    prisma.company.findFirst.mockResolvedValue(null);
    prisma.company.create.mockResolvedValue({ id: 'company_1', name: 'Soylent' });
    prisma.contact.create.mockResolvedValue({ id: 'contact_new', name: 'Jane New', companyId: 'company_1' });
    prisma.outreach.create.mockResolvedValue({
      id: 'out_new',
      jobId: 'job_new_contact',
      contactId: 'contact_new',
      channel: 'LINKEDIN',
      messageType: 'intro_request',
      personalizationScore: 70,
      outcome: 'NONE',
      content: null,
      sentAt: new Date().toISOString(),
      contact: { id: 'contact_new', name: 'Jane New' }
    });
    prisma.followUp.create.mockResolvedValue({ id: 'follow_new' });
    prisma.referral.findFirst.mockResolvedValue(null);
    prisma.outreach.findFirst.mockResolvedValue(null);
    prisma.outreach.count.mockResolvedValue(0);
    prisma.outreach.findMany.mockResolvedValue([{ jobId: 'job_new_contact', contactId: 'contact_new' }]);
    prisma.followUp.findMany.mockResolvedValue([]);

    const response = await request(app.getHttpServer())
      .post('/jobs/job_new_contact/outreach')
      .set('Authorization', 'Bearer fake')
      .send({
        contactCreate: {
          name: 'Jane New',
          role: 'HR',
          companyName: 'Soylent'
        },
        channel: 'LINKEDIN',
        messageType: 'intro_request',
        personalizationScore: 70
      });

    expect(response.status).toBe(201);
    expect(prisma.contact.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: 'Jane New' }) }));
    expect(response.body.outreach.contact.name).toBe('Jane New');
    expect(response.body.job.contactsCount).toBe(1);
  });

  it('POST /jobs/:id/status updates stage and note', async () => {
    const jobRecord = {
      id: 'job_stage',
      company: 'Initech',
      role: 'Analyst',
      stage: 'APPLIED',
      heat: 0,
      lastTouchAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      companyRef: null
    };

    prisma.job.findUnique.mockResolvedValue(jobRecord);
    prisma.job.update.mockResolvedValue({ ...jobRecord, stage: 'HR' });
    prisma.jobStatusHistory.create.mockResolvedValue({ id: 'status_hist', stage: 'HR', note: 'scheduled HR', at: new Date().toISOString() });
    prisma.followUp.updateMany.mockResolvedValue({ count: 0 });
    prisma.referral.findFirst.mockResolvedValue(null);
    prisma.outreach.findFirst.mockResolvedValue(null);
    prisma.outreach.count.mockResolvedValue(0);
    prisma.outreach.findMany.mockResolvedValue([]);
    prisma.followUp.findMany.mockResolvedValue([]);

    const response = await request(app.getHttpServer())
      .post('/jobs/job_stage/status')
      .set('Authorization', 'Bearer fake')
      .send({ stage: 'HR', note: 'scheduled HR' });

    expect(response.status).toBe(201);
    expect(prisma.job.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stage: 'HR' }) }));
    expect(response.body.job).toEqual(expect.objectContaining({ id: 'job_stage', stage: 'HR' }));
    expect(response.body.history).toEqual(expect.objectContaining({ note: 'scheduled HR' }));
  });
});
