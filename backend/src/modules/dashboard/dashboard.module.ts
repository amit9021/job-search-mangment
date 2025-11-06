import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FollowupsModule } from '../followups/followups.module';
import { JobsModule } from '../jobs/jobs.module';
import { KpiModule } from '../kpi/kpi.module';
import { OutreachModule } from '../outreach/outreach.module';
import { StatsModule } from '../stats/stats.module';
import { TasksModule } from '../tasks/tasks.module';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    ConfigModule,
    TasksModule,
    JobsModule,
    OutreachModule,
    FollowupsModule,
    KpiModule,
    StatsModule
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService]
})
export class DashboardModule {}
