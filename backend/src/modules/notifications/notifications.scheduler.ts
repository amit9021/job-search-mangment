import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import dayjs from '../../utils/dayjs';
import { FollowupsService } from '../followups/followups.service';

import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsScheduler {
  private readonly timeZone: string;

  constructor(
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => FollowupsService))
    private readonly followupsService: FollowupsService,
    configService: ConfigService
  ) {
    this.timeZone = configService.get<string>('TIMEZONE', 'UTC');
  }

  @Cron('0 9,12,17 * * *', { timeZone: 'UTC' })
  async dailyNudgesUtc() {
    await this.dispatchDailyNudges();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async followupReminder() {
    const dueToday = await this.followupsService.getDue('today');
    const now = dayjs();
    for (const item of dueToday) {
      const label = item.jobId
        ? `Job ${item.jobId}`
        : item.contactId
          ? `Contact ${item.contactId}`
          : 'General';
      await this.notificationsService.ensureNotification(
        'followup_due',
        `Follow-up due: ${label}`,
        now.toDate(),
        { jobId: item.jobId ?? undefined, contactId: item.contactId ?? undefined }
      );
    }
  }

  private async dispatchDailyNudges() {
    const tzNow = dayjs().tz?.(this.timeZone) ?? dayjs();
    const dueAt = tzNow.startOf('hour').toDate();
    const nudges = [
      'One more tailored CV to hit your daily target!',
      'Reach out to a warm contact to keep momentum.',
      'Check pending follow-ups before the day ends.'
    ];
    for (const message of nudges) {
      await this.notificationsService.createDailyNudge(message, dueAt);
    }
  }
}
