import { forwardRef, Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';

import { FollowupsController } from './followups.controller';
import { FollowupsService } from './followups.service';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [FollowupsController],
  providers: [FollowupsService],
  exports: [FollowupsService]
})
export class FollowupsModule {}
