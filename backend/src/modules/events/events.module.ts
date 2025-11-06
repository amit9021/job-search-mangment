import { Module } from '@nestjs/common';

import { FollowupsModule } from '../followups/followups.module';

import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [FollowupsModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService]
})
export class EventsModule {}
