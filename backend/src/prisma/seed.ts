import fs from 'fs';
import path from 'path';

import type { Prisma } from '@prisma/client';
import {
  PrismaClient,
  ContactStrength,
  JobStage,
  OutreachChannel,
  OutreachOutcome,
  ReferralKind,
  EventStatus
} from '@prisma/client';
import argon2 from 'argon2';

type MockData = {
  companies: { name: string; domain: string }[];
  jobRoles: string[];
  jobSources: string[];
  contactFirstNames: string[];
  contactLastNames: string[];
  contactRoles: string[];
  taskTemplates: { title: string; priority: string; status: string }[];
  growthEventNames: string[];
  growthReviewProjects: string[];
  growthBoostIdeas: string[];
};

const prisma = new PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const randomItem = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomBool = (probability = 0.5) => Math.random() < probability;
const now = new Date();

const shiftFromNow = (days: number, hours = 0) =>
  new Date(now.getTime() + days * DAY_MS + hours * HOUR_MS);
const randomPastDate = (maxDaysAgo: number) =>
  shiftFromNow(-randomInt(0, maxDaysAgo), randomInt(-6, 6));
const randomFutureDate = (maxDaysAhead: number) =>
  shiftFromNow(randomInt(0, maxDaysAhead), randomInt(-6, 6));

const loadMockData = (): MockData => {
  const mockPath = path.join(__dirname, 'mock-data.json');
  return JSON.parse(fs.readFileSync(mockPath, 'utf-8')) as MockData;
};

async function resetData(preserveAdminUsername: string) {
  await prisma.$transaction([
    prisma.projectHighlight.deleteMany({}),
    prisma.growthBoostTask.deleteMany({}),
    prisma.growthEvent.deleteMany({}),
    prisma.growthReview.deleteMany({}),
    prisma.boostTask.deleteMany({}),
    prisma.eventContact.deleteMany({}),
    prisma.event.deleteMany({}),
    prisma.codeReview.deleteMany({}),
    prisma.project.deleteMany({}),
    prisma.metricSnapshot.deleteMany({}),
    prisma.recommendation.deleteMany({}),
    prisma.notification.deleteMany({}),
    prisma.task.deleteMany({}),
    prisma.referral.deleteMany({}),
    prisma.followUp.deleteMany({}),
    prisma.outreach.deleteMany({}),
    prisma.contact.deleteMany({}),
    prisma.jobApplication.deleteMany({}),
    prisma.jobStatusHistory.deleteMany({}),
    prisma.job.deleteMany({}),
    prisma.company.deleteMany({}),
    prisma.user.deleteMany({ where: { username: { not: preserveAdminUsername } } })
  ]);
}

async function seedCompanies(companies: MockData['companies'], ownerId: string) {
  return Promise.all(
    companies.map((company) =>
      prisma.company.create({
        data: {
          ...company,
          userId: ownerId
        }
      })
    )
  );
}

async function seedContacts(
  companies: Awaited<ReturnType<typeof seedCompanies>>,
  mock: MockData,
  ownerId: string
) {
  const contacts: Awaited<ReturnType<typeof prisma.contact.create>>[] = [];
  const contactsByCompanyId = new Map<
    string,
    Awaited<ReturnType<typeof prisma.contact.create>>[]
  >();

  for (let i = 0; i < 50; i += 1) {
    const company = companies[i % companies.length];
    const firstName = randomItem(mock.contactFirstNames);
    const lastName = randomItem(mock.contactLastNames);
    const role = randomItem(mock.contactRoles);
    const strength = randomItem([
      ContactStrength.WEAK,
      ContactStrength.MEDIUM,
      ContactStrength.STRONG
    ]);
    const isArchived = i < 5; // keep a few archived to validate filters
    const emailDomain = company.domain ?? 'example.com';
    const email = `${firstName}.${lastName}@${emailDomain}`.toLowerCase();
    const linkedinSlug = `${firstName}-${lastName}`.toLowerCase();

    const contact = await prisma.contact.create({
      data: {
        name: `${firstName} ${lastName}`,
        role,
        strength,
        email,
        companyId: company.id,
        linkedinUrl: `https://www.linkedin.com/in/${linkedinSlug}`,
        location: randomItem(['Remote', 'NYC', 'Berlin', 'Tel Aviv', 'London']),
        tags: strength === ContactStrength.STRONG ? ['warm', 'advocate'] : ['prospect', 'demo'],
        notes:
          strength === ContactStrength.STRONG
            ? 'Regular check-ins every other week.'
            : 'Met during recent outreach.',
        archived: isArchived,
        archivedAt: isArchived ? randomPastDate(10) : undefined,
        userId: ownerId
      }
    });

    contacts.push(contact);
    const existing = contactsByCompanyId.get(company.id) ?? [];
    existing.push(contact);
    contactsByCompanyId.set(company.id, existing);
  }

  return { contacts, contactsByCompanyId };
}

function buildStatusHistory(stage: JobStage, createdAt: Date) {
  const appliedEntry = {
    stage: JobStage.APPLIED,
    at: createdAt,
    note: 'Applied with tailored CV'
  };

  if (stage === JobStage.APPLIED) {
    return [appliedEntry];
  }

  const transitionAt = new Date(createdAt.getTime() + randomInt(1, 5) * DAY_MS);
  const cappedTransition = transitionAt > now ? randomPastDate(3) : transitionAt;

  return [
    appliedEntry,
    {
      stage,
      at: cappedTransition,
      note:
        stage === JobStage.HR
          ? 'Screen scheduled with recruiter.'
          : stage === JobStage.TECH
            ? 'Advanced to technical loop.'
            : stage === JobStage.OFFER
              ? 'Offer negotiation in progress.'
              : stage === JobStage.REJECTED
                ? 'Company closed the role.'
                : 'No activity in last 2 weeks.'
    }
  ];
}

async function seedJobs(
  companies: Awaited<ReturnType<typeof seedCompanies>>,
  mock: MockData,
  ownerId: string
) {
  const stages = [
    JobStage.APPLIED,
    JobStage.HR,
    JobStage.TECH,
    JobStage.APPLIED,
    JobStage.OFFER,
    JobStage.REJECTED,
    JobStage.DORMANT
  ];

  const jobs: Awaited<ReturnType<typeof prisma.job.create>>[] = [];

  for (let i = 0; i < 50; i += 1) {
    const company = companies[i % companies.length];
    const stage = stages[i % stages.length];
    const createdAt = randomPastDate(21);
    const lastTouchOffset = randomInt(0, 7);
    const lastTouch = new Date(
      createdAt.getTime() + lastTouchOffset * DAY_MS + randomInt(0, 6) * HOUR_MS
    );
    const heat = randomInt(0, 3);
    const isArchived = i < 6;
    const deadline =
      stage === JobStage.REJECTED || stage === JobStage.DORMANT ? undefined : randomFutureDate(21);
    const slug = mock.jobRoles[i % mock.jobRoles.length].toLowerCase().replace(/\s+/g, '-');

    const statusHistory = buildStatusHistory(stage, createdAt);
    const job = await prisma.job.create({
      data: {
        company: company.name,
        companyId: company.id,
        role: randomItem(mock.jobRoles),
        sourceUrl: `https://${company.domain ?? 'example.com'}/careers/${slug}`,
        heat: isArchived ? Math.min(heat, 1) : heat,
        stage,
        deadline,
        lastTouchAt: lastTouch > now ? randomPastDate(3) : lastTouch,
        createdAt,
        archived: isArchived,
        archivedAt: isArchived ? randomPastDate(14) : undefined,
        applications: {
          create: {
            dateSent: new Date(createdAt.getTime() + randomInt(0, 2) * DAY_MS),
            tailoringScore: randomInt(55, 98)
          }
        },
        statusHistory: { create: statusHistory },
        userId: ownerId
      }
    });

    jobs.push(job);
  }

  return jobs;
}

async function seedOutreachAndFollowUps(
  jobs: Awaited<ReturnType<typeof seedJobs>>,
  contacts: Awaited<ReturnType<typeof seedContacts>>
) {
  const { contacts: allContacts, contactsByCompanyId } = contacts;
  const activeContacts = allContacts.filter((contact) => !contact.archived);
  const channels = [
    OutreachChannel.EMAIL,
    OutreachChannel.LINKEDIN,
    OutreachChannel.PHONE,
    OutreachChannel.OTHER
  ];
  const messageTypes = ['intro_request', 'follow_up', 'thank_you', 'check_in'];

  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i];
    const companyContacts = job.companyId ? (contactsByCompanyId.get(job.companyId) ?? []) : [];
    const cleanPool = companyContacts.filter((contact) => !contact.archived);
    const fallbackPool = cleanPool.length ? cleanPool : activeContacts;
    const contact = fallbackPool.length ? randomItem(fallbackPool) : undefined;
    const isStale = i % 7 === 0;
    const outcomePool = isStale
      ? [OutreachOutcome.NONE]
      : [OutreachOutcome.POSITIVE, OutreachOutcome.NO_RESPONSE, OutreachOutcome.NEGATIVE];
    const sentAt = isStale ? randomPastDate(6) : randomPastDate(14);

    await prisma.outreach.create({
      data: {
        jobId: job.id,
        contactId: contact?.id,
        channel: channels[i % channels.length],
        messageType: messageTypes[i % messageTypes.length],
        personalizationScore: randomInt(40, 95),
        outcome: randomItem(outcomePool),
        content: 'Demo outreach content seeded for dashboard views.',
        sentAt
      }
    });

    if (job.archived || !contact || contact.archived) {
      continue;
    }

    if (i % 2 === 0) {
      const dueCategory = i % 3;
      const dueAt =
        dueCategory === 0
          ? randomPastDate(5)
          : dueCategory === 1
            ? shiftFromNow(0, randomInt(1, 4))
            : randomFutureDate(5);
      const sentAtFollowUp = dueCategory === 0 ? randomPastDate(1) : undefined;

      await prisma.followUp.create({
        data: {
          jobId: job.id,
          contactId: contact.id,
          attemptNo: dueCategory === 2 ? 2 : 1,
          dueAt,
          sentAt: sentAtFollowUp
        }
      });
    }
  }
}

async function seedReferrals(
  jobs: Awaited<ReturnType<typeof seedJobs>>,
  contacts: Awaited<ReturnType<typeof seedContacts>>
) {
  const activeJobs = jobs.filter((job) => !job.archived);
  const strongContacts = contacts.contacts.filter(
    (contact) => !contact.archived && contact.strength !== ContactStrength.WEAK
  );

  const referralsToCreate = Math.min(12, activeJobs.length, strongContacts.length);

  for (let i = 0; i < referralsToCreate; i += 1) {
    const job = activeJobs[i % activeJobs.length];
    const contact = strongContacts[i % strongContacts.length];

    await prisma.referral.create({
      data: {
        jobId: job.id,
        contactId: contact.id,
        kind: randomItem([ReferralKind.INTRO, ReferralKind.REFERRAL, ReferralKind.SENT_CV]),
        note: 'Seeded referral to showcase warm intros.'
      }
    });
  }
}

async function seedTasks(
  jobs: Awaited<ReturnType<typeof seedJobs>>,
  contacts: Awaited<ReturnType<typeof seedContacts>>,
  mock: MockData,
  ownerId: string
) {
  const tasksData: Prisma.TaskCreateManyInput[] = [];
  const activeJobs = jobs.filter((job) => !job.archived);
  const activeContacts = contacts.contacts.filter((contact) => !contact.archived);
  const jobPool = activeJobs.length ? activeJobs : jobs;
  const contactPool = activeContacts.length ? activeContacts : contacts.contacts;

  if (!jobPool.length) {
    return;
  }

  for (let i = 0; i < 50; i += 1) {
    const template = mock.taskTemplates[i % mock.taskTemplates.length];
    const job = jobPool[(i + 3) % jobPool.length];
    const contact = contactPool.length ? contactPool[(i + 5) % contactPool.length] : undefined;
    const dueBucket = i % 3;
    const dueAt =
      dueBucket === 0
        ? randomPastDate(4)
        : dueBucket === 1
          ? shiftFromNow(0, randomInt(1, 5))
          : randomFutureDate(6);
    const completed =
      template.status.toLowerCase() === 'done' ||
      (template.status.toLowerCase() === 'todo' && randomBool(0.2));
    const contactName = contact ? contact.name.split(' ')[0] : 'contact';

    let title = template.title;
    title = title.replace(/{{company}}/g, job.company);
    title = title.replace(/{{role}}/g, job.role);
    title = title.replace(/{{contact}}/g, contactName);

    const links: Record<string, string> = {};
    if (job) {
      links.jobId = job.id;
    }
    if (contact) {
      links.contactId = contact.id;
    }

    tasksData.push({
      title,
      priority: template.priority,
      status: completed ? 'Done' : template.status,
      dueAt,
      startAt: randomBool(0.4) ? randomPastDate(3) : undefined,
      tags: completed ? ['dashboard', 'demo'] : ['demo'],
      description: 'Seeded task to exercise dashboard flows.',
      links: Object.keys(links).length ? (links as unknown as Prisma.JsonObject) : undefined,
      completedAt: completed ? randomPastDate(2) : undefined,
      userId: ownerId
    });
  }

  await prisma.task.createMany({ data: tasksData });
}

async function seedGrowth(
  contacts: Awaited<ReturnType<typeof seedContacts>>,
  mock: MockData,
  ownerId: string
) {
  const strongContacts = contacts.contacts.filter(
    (contact) => !contact.archived && contact.strength !== ContactStrength.WEAK
  );

  await Promise.all(
    Array.from({ length: 15 }).map((_, index) =>
      prisma.growthEvent.create({
        data: {
          name: mock.growthEventNames[index % mock.growthEventNames.length],
          date: randomPastDate(21),
          location: randomItem(['Remote', 'NYC', 'Berlin', 'SF', 'London']),
          attended: index % 3 !== 0,
          notes: 'Seeded event to showcase Grow dashboard charts.',
          followUps: index % 3 === 0 ? ['Connect with panelist', 'Share recap'] : [],
          userId: ownerId
        }
      })
    )
  );

  await Promise.all(
    Array.from({ length: 15 }).map((_, index) =>
      prisma.growthBoostTask.create({
        data: {
          title: mock.growthBoostIdeas[index % mock.growthBoostIdeas.length],
          description: 'Seeded boost task to prompt storytelling or visibility work.',
          category: index % 2 === 0 ? 'visibility-gap' : 'network-gap',
          impactLevel: randomInt(2, 5),
          tags: index % 2 === 0 ? ['linkedin', 'writing'] : ['networking'],
          status: index % 4 === 0 ? 'completed' : 'pending',
          completedAt: index % 4 === 0 ? randomPastDate(7) : undefined,
          userId: ownerId
        }
      })
    )
  );

  await Promise.all(
    Array.from({ length: 10 }).map((_, index) => {
      if (!strongContacts.length) {
        return Promise.resolve();
      }
      const reviewer = strongContacts[index % strongContacts.length];
      return prisma.growthReview.create({
        data: {
          reviewerId: reviewer.id,
          projectName: mock.growthReviewProjects[index % mock.growthReviewProjects.length],
          summary: 'Seeded growth review capturing qualitative feedback.',
          score: randomInt(3, 5),
          takeaways: 'Focus next on leverage stories and improved storytelling.',
          reviewedAt: randomPastDate(14),
          userId: ownerId
        }
      });
    })
  );

  await Promise.all(
    Array.from({ length: 10 }).map((_, index) =>
      prisma.projectHighlight.create({
        data: {
          projectName: mock.growthReviewProjects[index % mock.growthReviewProjects.length],
          platformUrl: randomBool(0.7)
            ? `https://www.linkedin.com/posts/demo-highlight-${index}`
            : undefined,
          spotlight: index % 2 === 0,
          plannedPost: 'Seeded highlight to showcase storytelling opportunities.',
          published: index % 3 === 0,
          publishedAt: index % 3 === 0 ? randomPastDate(10) : undefined,
          userId: ownerId
        }
      })
    )
  );
}

async function seedNetworkingEvents(
  contacts: Awaited<ReturnType<typeof seedContacts>>,
  _mock: MockData
) {
  const strongContacts = contacts.contacts.filter(
    (contact) => !contact.archived && contact.strength !== ContactStrength.WEAK
  );

  const eventNames = [
    'Tech Leaders Meetup',
    'Hiring Managers Roundtable',
    'Product Builders Circle',
    'ScaleUp Showcase',
    'AI Guild Sync',
    'Security Champions Summit'
  ];
  const topics = [
    'Scaling platform teams',
    'Hiring for senior ICs',
    'Product growth tactics',
    'Leveraging AI assistants',
    'Security automation',
    'Operational excellence'
  ];

  const events = await Promise.all(
    Array.from({ length: 12 }).map((_, index) =>
      prisma.event.create({
        data: {
          name: eventNames[index % eventNames.length],
          date: randomPastDate(18),
          location: randomItem(['Remote', 'NYC', 'Berlin', 'SF', 'London']),
          topic: topics[index % topics.length],
          status: index % 3 === 0 ? EventStatus.PLANNED : EventStatus.ATTENDED,
          targetsMinConversations: randomInt(2, 5)
        }
      })
    )
  );

  if (!strongContacts.length) {
    return;
  }

  await Promise.all(
    events.map((event, index) => {
      const contact = strongContacts[index % strongContacts.length];
      return prisma.eventContact.create({
        data: {
          eventId: event.id,
          contactId: contact.id,
          followupDueAt: index % 2 === 0 ? randomFutureDate(4) : randomPastDate(2)
        }
      });
    })
  );
}

async function seedMetricSnapshots() {
  const metrics = ['tailored_cvs', 'warm_outreach', 'followups_completed', 'followups_due'];
  const data: Prisma.MetricSnapshotCreateManyInput[] = [];

  for (let day = 30; day >= 0; day -= 1) {
    const metricDate = shiftFromNow(-day);
    metrics.forEach((kpiName, index) => {
      data.push({
        date: metricDate,
        kpiName,
        value: kpiName === 'followups_due' ? randomInt(0, 5) : randomInt(index + 1, index + 7)
      });
    });
  }

  await prisma.metricSnapshot.createMany({ data });
}

async function seedNotifications(
  jobs: Awaited<ReturnType<typeof seedJobs>>,
  contacts: Awaited<ReturnType<typeof seedContacts>>
) {
  const activeJobs = jobs.filter((job) => !job.archived);
  const activeContacts = contacts.contacts.filter((contact) => !contact.archived);
  const jobPool = activeJobs.length ? activeJobs : jobs;
  const contactPool = activeContacts.length ? activeContacts : contacts.contacts;

  if (!jobPool.length || !contactPool.length) {
    return;
  }

  const notifications = Array.from({ length: 12 }).map((_, index) => {
    const job = jobPool[index % jobPool.length];
    const contact = contactPool[index % contactPool.length];
    return {
      kind: index % 3 === 0 ? 'followup_overdue' : index % 3 === 1 ? 'followup_due' : 'target_gap',
      message:
        index % 3 === 0
          ? `Follow up with ${contact.name} is overdue`
          : index % 3 === 1
            ? `Follow up with ${contact.name} is due today`
            : `You are ${randomInt(1, 3)} tailored CVs short of target`,
      dueAt: index % 3 === 2 ? shiftFromNow(0, randomInt(1, 6)) : randomPastDate(2),
      jobId: job?.id,
      contactId: contact?.id
    };
  });

  await prisma.notification.createMany({ data: notifications });
}

async function seedRecommendations(
  jobs: Awaited<ReturnType<typeof seedJobs>>,
  contacts: Awaited<ReturnType<typeof seedContacts>>
) {
  const activeJobs = jobs.filter((job) => !job.archived);
  const activeContacts = contacts.contacts.filter((contact) => !contact.archived);
  const jobPool = activeJobs.length ? activeJobs : jobs;
  const contactPool = activeContacts.length ? activeContacts : contacts.contacts;

  if (!jobPool.length || !contactPool.length) {
    return;
  }

  await prisma.recommendation.create({
    data: {
      kind: 'next_best_action',
      payload: {
        title: 'Reach out to your hottest lead',
        jobId: jobPool[0].id,
        contactId: contactPool[0].id
      }
    }
  });
}

async function main() {
  const mock = loadMockData();
  const adminUsername = process.env.ADMIN_USERNAME ?? 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'change_me';
  const passwordHash = await argon2.hash(adminPassword);

  await resetData(adminUsername);

  const user = await prisma.user.upsert({
    where: { username: adminUsername },
    update: { passwordHash },
    create: { username: adminUsername, passwordHash }
  });

  const ownerId = user.id;

  const companies = await seedCompanies(mock.companies, ownerId);
  const contactSeed = await seedContacts(companies, mock, ownerId);
  const jobs = await seedJobs(companies, mock, ownerId);

  await seedNetworkingEvents(contactSeed, mock);
  await seedOutreachAndFollowUps(jobs, contactSeed);
  await seedReferrals(jobs, contactSeed);
  await seedTasks(jobs, contactSeed, mock, ownerId);
  await seedGrowth(contactSeed, mock, ownerId);
  await seedMetricSnapshots();
  await seedNotifications(jobs, contactSeed);
  await seedRecommendations(jobs, contactSeed);

  // eslint-disable-next-line no-console
  console.log('Seed completed:');
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        users: 1,
        companies: companies.length,
        contacts: contactSeed.contacts.length,
        jobs: jobs.length,
        tasks: 50,
        growth: 50
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
