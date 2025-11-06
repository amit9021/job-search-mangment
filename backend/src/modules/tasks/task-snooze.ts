import type { Dayjs } from 'dayjs';

import dayjs from '../../utils/dayjs';

import type { SnoozePreset } from './task.constants';
import { DEFAULT_TASK_TIME } from './task.constants';

type SnoozeOptions = {
  now?: Dayjs;
  timezone?: string;
};

export function computeSnoozedDueAt(preset: SnoozePreset, options: SnoozeOptions = {}) {
  const timezone = options.timezone ?? process.env.TIMEZONE ?? 'UTC';
  const base = options.now ? options.now.clone() : dayjs().tz(timezone);

  switch (preset) {
    case '1h':
      return base.add(1, 'hour').toDate();
    case 'tonight': {
      const target = base.hour(20).minute(0).second(0).millisecond(0);
      if (target.isBefore(base)) {
        return target.add(1, 'day').toDate();
      }
      return target.toDate();
    }
    case 'tomorrow': {
      return base
        .add(1, 'day')
        .hour(DEFAULT_TASK_TIME.hour)
        .minute(DEFAULT_TASK_TIME.minute)
        .second(0)
        .millisecond(0)
        .toDate();
    }
    case 'nextweek': {
      const target = base
        .add(1, 'week')
        .startOf('week')
        .add(1, 'day') // Monday
        .hour(DEFAULT_TASK_TIME.hour)
        .minute(DEFAULT_TASK_TIME.minute)
        .second(0)
        .millisecond(0);

      // Adjust in case locale week starts on Monday already
      if (target.day() !== 1) {
        const daysToMonday = (8 - target.day()) % 7;
        return target.add(daysToMonday, 'day').toDate();
      }
      return target.toDate();
    }
    default:
      return base.toDate();
  }
}
