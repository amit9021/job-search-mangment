import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FollowupsModule } from '../followups/followups.module';

import { NotificationsController } from './notifications.controller';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [ConfigModule, forwardRef(() => FollowupsModule)],
  providers: [NotificationsService, NotificationsScheduler],
  controllers: [NotificationsController],
  exports: [NotificationsService]
})
export class NotificationsModule {}
