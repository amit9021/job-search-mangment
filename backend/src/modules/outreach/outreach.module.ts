import { Module, forwardRef } from '@nestjs/common';

import { FollowupsModule } from '../followups/followups.module';
import { JobsModule } from '../jobs/jobs.module';
import { TasksModule } from '../tasks/tasks.module';

import { OutreachController } from './outreach.controller';
import { OutreachService } from './outreach.service';

@Module({
  imports: [FollowupsModule, forwardRef(() => JobsModule), TasksModule],
  controllers: [OutreachController],
  providers: [OutreachService],
  exports: [OutreachService]
})
export class OutreachModule {}
