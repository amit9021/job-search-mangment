import { Module, forwardRef } from '@nestjs/common';
import { OutreachService } from './outreach.service';
import { OutreachController } from './outreach.controller';
import { JobsModule } from '../jobs/jobs.module';
import { FollowupsModule } from '../followups/followups.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [FollowupsModule, forwardRef(() => JobsModule), TasksModule],
  controllers: [OutreachController],
  providers: [OutreachService],
  exports: [OutreachService]
})
export class OutreachModule {}
