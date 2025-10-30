import { PrismaClient, ContactStrength, EventStatus, JobStage, OutreachChannel, OutreachOutcome, ReferralKind } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME ?? 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'change_me';
  const passwordHash = await argon2.hash(adminPassword);

  await prisma.user.upsert({
    where: { username: adminUsername },
    update: { passwordHash },
    create: { username: adminUsername, passwordHash }
  });

  const [jobAlpha, jobBeta] = await Promise.all([
    prisma.job.create({
      data: {
        company: 'Alpha Labs',
        role: 'Senior Backend Engineer',
        heat: 1,
        stage: JobStage.APPLIED,
        applications: {
          create: {
            dateSent: new Date(),
            tailoringScore: 78
          }
        },
        statusHistory: {
          create: { stage: JobStage.APPLIED, note: 'Initial application submitted' }
        }
      }
    }),
    prisma.job.create({
      data: {
        company: 'Beta Systems',
        role: 'Full Stack Developer',
        heat: 0,
        stage: JobStage.APPLIED,
        statusHistory: {
          create: { stage: JobStage.APPLIED, note: 'Initial application submitted' }
        }
      }
    })
  ]);

  const [contactWeak, contactMedium, contactStrong] = await Promise.all([
    prisma.contact.create({
      data: {
        name: 'Jamie Connector',
        company: 'Alpha Labs',
        role: 'HR Partner',
        strength: ContactStrength.WEAK
      }
    }),
    prisma.contact.create({
      data: {
        name: 'Taylor Supporter',
        company: 'Beta Systems',
        role: 'Engineering Manager',
        strength: ContactStrength.MEDIUM
      }
    }),
    prisma.contact.create({
      data: {
        name: 'Morgan Champion',
        company: 'Gamma Ventures',
        role: 'Principal Engineer',
        strength: ContactStrength.STRONG
      }
    })
  ]);

  await prisma.outreach.create({
    data: {
      jobId: jobAlpha.id,
      contactId: contactMedium.id,
      channel: OutreachChannel.LINKEDIN,
      messageType: 'intro_request',
      personalizationScore: 85,
      outcome: OutreachOutcome.POSITIVE,
      content: 'Excited about the role — would love to connect!'
    }
  });

  await prisma.followUp.create({
    data: {
      jobId: jobAlpha.id,
      contactId: contactMedium.id,
      attemptNo: 1,
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.referral.create({
    data: {
      contactId: contactStrong.id,
      jobId: jobBeta.id,
      kind: ReferralKind.INTRO,
      note: 'Happy to refer once you apply.'
    }
  });

  const project = await prisma.project.create({
    data: {
      name: 'AI Portfolio Platform',
      repoUrl: 'https://github.com/example/ai-portfolio',
      stack: 'NestJS, React, Postgres',
      spotlight: true
    }
  });

  await prisma.codeReview.create({
    data: {
      projectId: project.id,
      contactId: contactStrong.id,
      summary: 'Solid architecture, consider load testing.',
      qualityScore: 90,
      reviewedAt: new Date()
    }
  });

  const event = await prisma.event.create({
    data: {
      name: 'Tech Leaders Meetup',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      location: 'Tel Aviv',
      topic: 'Scaling Platform Teams',
      status: EventStatus.PLANNED,
      targetsMinConversations: 3
    }
  });

  await prisma.eventContact.create({
    data: {
      eventId: event.id,
      contactId: contactWeak.id,
      followupDueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.boostTask.create({
    data: {
      title: 'Record Loom video walkthrough of flagship project',
      impactScore: 8
    }
  });
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
