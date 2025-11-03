import dayjs from '../../utils/dayjs';
import { calculateCompletionStreak } from './task-kpis';

describe('calculateCompletionStreak', () => {
  it('counts consecutive days including today', () => {
    const now = dayjs('2025-01-10T10:00:00Z');
    const dates = [
      new Date('2025-01-10T08:00:00Z'),
      new Date('2025-01-09T18:00:00Z'),
      new Date('2025-01-08T12:00:00Z'),
      new Date('2025-01-06T12:00:00Z') // gap on 7th -> streak stops at 3
    ];

    expect(calculateCompletionStreak(dates, { now, timezone: 'UTC' })).toBe(3);
  });

  it('returns zero when today has no completions', () => {
    const now = dayjs('2025-01-10T10:00:00Z');
    const dates = [new Date('2025-01-09T18:00:00Z')];
    expect(calculateCompletionStreak(dates, { now, timezone: 'UTC' })).toBe(0);
  });
});
