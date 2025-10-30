import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsScheduler } from './notifications.scheduler';
import { FollowupsModule } from '../followups/followups.module';

@Module({
  imports: [ConfigModule, forwardRef(() => FollowupsModule)],
  providers: [NotificationsService, NotificationsScheduler],
  controllers: [NotificationsController],
  exports: [NotificationsService]
})
export class NotificationsModule {}
