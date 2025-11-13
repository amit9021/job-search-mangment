import { PrismaService } from '../src/prisma/prisma.service';
import { RequestContextService } from '../src/common/context/request-context.service';

async function withUser<T>(requestContext: RequestContextService, userId: string, fn: () => Promise<T>) {
  return await new Promise<T>((resolve, reject) => {
    requestContext.run(async () => {
      try {
        requestContext.setUser({ id: userId });
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function main() {
  const requestContext = new RequestContextService();
  const prisma = new PrismaService(requestContext);
  await prisma.$connect();
  await prisma.job.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.user.deleteMany({});

  const userA = await prisma.user.create({ data: { email: 'a@example.com', passwordHash: 'x' } });
  const userB = await prisma.user.create({ data: { email: 'b@example.com', passwordHash: 'x' } });

  await withUser(requestContext, userA.id, async () => {
    await prisma.job.create({ data: { company: 'Acme', role: 'Dev', heat: 1 } });
  });

  const jobsA = await withUser(requestContext, userA.id, async () => prisma.job.findMany());
  const jobsB = await withUser(requestContext, userB.id, async () => prisma.job.findMany());

  console.log('jobs for A', jobsA.length);
  console.log('jobs for B', jobsB.length);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
