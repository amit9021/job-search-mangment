import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { FollowupsModule } from '../followups/followups.module';
import { OutreachModule } from '../outreach/outreach.module';

@Module({
  imports: [FollowupsModule, OutreachModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService]
})
export class JobsModule {}
