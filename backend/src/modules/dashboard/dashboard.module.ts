import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TasksModule } from '../tasks/tasks.module';
import { JobsModule } from '../jobs/jobs.module';
import { OutreachModule } from '../outreach/outreach.module';
import { FollowupsModule } from '../followups/followups.module';
import { KpiModule } from '../kpi/kpi.module';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [ConfigModule, TasksModule, JobsModule, OutreachModule, FollowupsModule, KpiModule, StatsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService]
})
export class DashboardModule {}
