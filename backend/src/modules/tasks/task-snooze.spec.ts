import dayjs from '../../utils/dayjs';

import { computeSnoozedDueAt } from './task-snooze';

describe('computeSnoozedDueAt', () => {
  const base = dayjs('2025-01-05T15:30:00Z'); // Sunday

  it('adds one hour for 1h preset', () => {
    const result = computeSnoozedDueAt('1h', { now: base, timezone: 'UTC' });
    expect(dayjs(result).toISOString()).toBe('2025-01-05T16:30:00.000Z');
  });

  it('moves to 20:00 same day for tonight before 20:00', () => {
    const result = computeSnoozedDueAt('tonight', { now: base, timezone: 'UTC' });
    expect(dayjs(result).hour()).toBe(20);
    expect(dayjs(result).day()).toBe(base.day());
  });

  it('pushes to tomorrow morning for tomorrow preset', () => {
    const result = computeSnoozedDueAt('tomorrow', { now: base, timezone: 'UTC' });
    expect(dayjs(result).day()).toBe((base.day() + 1) % 7);
    expect(dayjs(result).hour()).toBe(9);
    expect(dayjs(result).minute()).toBe(0);
  });

  it('targets next Monday 09:00 for nextweek preset', () => {
    const result = computeSnoozedDueAt('nextweek', { now: base, timezone: 'UTC' });
    const wrapped = dayjs(result);
    expect(wrapped.day()).toBe(1);
    expect(wrapped.hour()).toBe(9);
  });
});
