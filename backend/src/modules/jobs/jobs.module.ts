import { Module, forwardRef } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { FollowupsModule } from '../followups/followups.module';
import { OutreachModule } from '../outreach/outreach.module';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [FollowupsModule, forwardRef(() => OutreachModule), forwardRef(() => ContactsModule)],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService]
})
export class JobsModule {}
