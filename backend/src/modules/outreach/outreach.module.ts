import { Module, forwardRef } from '@nestjs/common';
import { OutreachService } from './outreach.service';
import { OutreachController } from './outreach.controller';
import { FollowupsModule } from '../followups/followups.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [FollowupsModule, forwardRef(() => JobsModule)],
  controllers: [OutreachController],
  providers: [OutreachService],
  exports: [OutreachService]
})
export class OutreachModule {}
