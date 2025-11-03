import type { Dayjs } from 'dayjs';
import dayjs from '../../utils/dayjs';

type StreakOptions = {
  now?: Dayjs;
  timezone?: string;
};

export function calculateCompletionStreak(dates: Date[], options: StreakOptions = {}) {
  if (!dates || dates.length === 0) {
    return 0;
  }
  const timezone = options.timezone ?? process.env.TIMEZONE ?? 'UTC';
  const now = options.now ? options.now.clone() : dayjs().tz(timezone);
  const seen = new Set<string>();

  for (const date of dates) {
    if (!date) continue;
    const key = dayjs(date).tz(timezone).format('YYYY-MM-DD');
    seen.add(key);
  }

  let streak = 0;
  let cursor = now.clone().startOf('day');

  while (streak <= 365) {
    const key = cursor.format('YYYY-MM-DD');
    if (seen.has(key)) {
      streak += 1;
      cursor = cursor.subtract(1, 'day');
      continue;
    }
    break;
  }

  return streak;
}
