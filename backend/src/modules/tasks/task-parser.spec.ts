import dayjs from '../../utils/dayjs';
import { parseQuickTaskInput } from './task-parser';

describe('parseQuickTaskInput', () => {
  it('extracts metadata, context, and scheduling cues', () => {
    const now = dayjs('2025-01-05T09:00:00Z');
    const result = parseQuickTaskInput(
      'Follow up with Dana next tue @10 #followup @contact:Dana @job:Acme !high',
      { now, timezone: 'UTC' }
    );

    expect(result.title).toBe('Follow up with Dana @job:Acme');
    expect(result.tags).toEqual(['followup']);
    expect(result.priority).toBe('High');
    expect(result.contexts.contactQuery).toBe('Dana');
    expect(result.contexts.jobQuery).toBe('Acme');
    expect(result.dueAt).not.toBeUndefined();
    expect(dayjs(result.dueAt).day()).toBe(2); // Tuesday
    expect(dayjs(result.dueAt).hour()).toBe(10);
  });

  it('parses recurrence rules and derives next occurrence', () => {
    const now = dayjs('2025-01-05T09:00:00Z'); // Sunday
    const result = parseQuickTaskInput('Study TS every mon wed fri @09 #skills', {
      now,
      timezone: 'UTC'
    });

    expect(result.tags).toEqual(['skills']);
    expect(result.recurrence).toBe('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=9;BYMINUTE=0;BYSECOND=0');
    expect(result.dueAt).not.toBeUndefined();
    expect(dayjs(result.dueAt).day()).toBe(1); // Next Monday
    expect(dayjs(result.dueAt).hour()).toBe(9);
  });

  it('defaults to original text when nothing remains after token removal', () => {
    const now = dayjs('2025-01-05T09:00:00Z');
    const result = parseQuickTaskInput('tomorrow 9 #ping', { now, timezone: 'UTC' });
    expect(result.title).toBe('tomorrow 9 #ping');
    expect(result.dueAt).not.toBeUndefined();
  });
});
