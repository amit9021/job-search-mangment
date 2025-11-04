import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { BoostsModule } from './modules/boosts/boosts.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { EventsModule } from './modules/events/events.module';
import { FollowupsModule } from './modules/followups/followups.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { KpiModule } from './modules/kpi/kpi.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OutreachModule } from './modules/outreach/outreach.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './common/health.controller';
import { GrowModule } from './modules/grow/grow.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { StatsModule } from './modules/stats/stats.module';
import appConfig from './config/app';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      load: [appConfig]
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    JobsModule,
    CompaniesModule,
    ContactsModule,
    OutreachModule,
    FollowupsModule,
    ReferralsModule,
    KpiModule,
    RecommendationModule,
    ProjectsModule,
    ReviewsModule,
    EventsModule,
    BoostsModule,
    GrowModule,
    NotificationsModule,
    TasksModule,
    DashboardModule,
    StatsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
