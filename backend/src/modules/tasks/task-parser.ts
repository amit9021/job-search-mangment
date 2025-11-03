import type { Dayjs } from 'dayjs';
import dayjs from '../../utils/dayjs';
import { DEFAULT_TASK_TIME, TaskPriority } from './task.constants';

type QuickParseOptions = {
  now?: Dayjs;
  timezone?: string;
};

export type QuickParseContexts = {
  jobQuery?: string;
  contactQuery?: string;
  growType?: string;
  growRef?: string;
};

export type QuickParseIntermediate = {
  title: string;
  tags: string[];
  priority?: TaskPriority;
  dueAt?: Date;
  recurrence?: string;
  contexts: QuickParseContexts;
};

const WEEKDAY_MAP: Record<string, { code: string; index: number }> = {
  mon: { code: 'MO', index: 1 },
  monday: { code: 'MO', index: 1 },
  tue: { code: 'TU', index: 2 },
  tues: { code: 'TU', index: 2 },
  tuesday: { code: 'TU', index: 2 },
  wed: { code: 'WE', index: 3 },
  weds: { code: 'WE', index: 3 },
  wednesday: { code: 'WE', index: 3 },
  thu: { code: 'TH', index: 4 },
  thur: { code: 'TH', index: 4 },
  thurs: { code: 'TH', index: 4 },
  thursday: { code: 'TH', index: 4 },
  fri: { code: 'FR', index: 5 },
  friday: { code: 'FR', index: 5 },
  sat: { code: 'SA', index: 6 },
  saturday: { code: 'SA', index: 6 },
  sun: { code: 'SU', index: 0 },
  sunday: { code: 'SU', index: 0 }
};

const PRIORITY_MAP: Record<string, TaskPriority> = {
  low: 'Low',
  med: 'Med',
  medium: 'Med',
  high: 'High'
};

type ParsedRecurrence = {
  matched?: string;
  rrule?: string;
  nextOccurrence?: Date;
};

export function parseQuickTaskInput(
  originalInput: string,
  options: QuickParseOptions = {}
): QuickParseIntermediate {
  const input = originalInput ?? '';
  const timezone = options.timezone ?? process.env.TIMEZONE ?? 'UTC';
  const now = options.now ? options.now.clone() : dayjs().tz(timezone);

  let working = input.trim();
  const tags = new Set<string>();
  const contexts: QuickParseContexts = {};
  let priority: TaskPriority | undefined;
  let dueAt: Date | undefined;
  let recurrence: string | undefined;

  // Tags
  const tagMatches = Array.from(working.matchAll(/#([\p{L}\p{N}_-]+)/giu));
  for (const match of tagMatches) {
    const value = match[1].trim();
    if (value) {
      tags.add(value);
    }
    working = working.replace(match[0], ' ');
  }

  // Priority
  const priorityMatch = working.match(/!(high|med|medium|low)/i);
  if (priorityMatch) {
    const mapped = PRIORITY_MAP[priorityMatch[1].toLowerCase()];
    if (mapped) {
      priority = mapped;
    }
    working = working.replace(priorityMatch[0], ' ');
  }

  // Contexts
  const contextRegex = /@(job|contact|grow):(?:"([^"]+)"|([^#@!\s]+))/gi;
  let contextMatch: RegExpExecArray | null;
  while ((contextMatch = contextRegex.exec(working)) !== null) {
    const kind = contextMatch[1].toLowerCase();
    const raw = (contextMatch[2] ?? contextMatch[3] ?? '').trim();
    if (!raw) {
      continue;
    }
    switch (kind) {
      case 'job':
        contexts.jobQuery = raw;
        break;
      case 'contact':
        contexts.contactQuery = raw;
        break;
      case 'grow': {
        const [growType, growRef] = raw.split(':', 2);
        if (growType) {
          contexts.growType = growType.toLowerCase();
        }
        if (growRef) {
          contexts.growRef = growRef;
        }
        break;
      }
      default:
        break;
    }
    working = working.replace(contextMatch[0], ' ');
  }

  // Recurrence (capture trailing segment)
  const recurrenceMatch = working.match(/\bevery\b.+$/i);
  if (recurrenceMatch) {
    const parsed = parseRecurrenceSegment(recurrenceMatch[0], now);
    if (parsed.rrule) {
      recurrence = parsed.rrule;
      if (!dueAt && parsed.nextOccurrence) {
        dueAt = parsed.nextOccurrence;
      }
    }
    if (parsed.matched) {
      working = working.replace(parsed.matched, ' ');
    } else {
      working = working.replace(recurrenceMatch[0], ' ');
    }
  }

  // Due date parsing (try multiple strategies)
  const dueParsers = [parseTomorrow, parseNextWeekday, parseInDuration];
  for (const parser of dueParsers) {
    const result = parser(working, now);
    if (result) {
      dueAt = result.dueAt;
      working = working.replace(result.matched, ' ');
      break;
    }
  }

  const title = cleanupText(working) || originalInput.trim();

  return {
    title,
    tags: Array.from(tags),
    priority,
    dueAt,
    recurrence,
    contexts
  };
}

type DueParseResult = { matched: string; dueAt: Date };

function parseTomorrow(working: string, now: Dayjs): DueParseResult | undefined {
  const regex = /\btomorrow\b(?:\s*(?:at|@)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i;
  const match = working.match(regex);
  if (!match) {
    return undefined;
  }
  const time = extractTime(match[1], match[2], match[3]);
  const target = now
    .clone()
    .add(1, 'day')
    .hour(time.hour)
    .minute(time.minute)
    .second(0)
    .millisecond(0);
  return { matched: match[0], dueAt: target.toDate() };
}

function parseNextWeekday(working: string, now: Dayjs): DueParseResult | undefined {
  const regex =
    /\bnext\s+(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b(?:\s*(?:at|@)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i;
  const match = working.match(regex);
  if (!match) {
    return undefined;
  }
  const weekdayToken = match[1].toLowerCase();
  const mapEntry = WEEKDAY_MAP[weekdayToken];
  if (!mapEntry) {
    return undefined;
  }
  const time = extractTime(match[2], match[3], match[4]);
  let candidate = now.clone().hour(time.hour).minute(time.minute).second(0).millisecond(0);
  for (let offset = 0; offset < 8; offset += 1) {
    if (candidate.day() === mapEntry.index && candidate.isAfter(now)) {
      return { matched: match[0], dueAt: candidate.toDate() };
    }
    candidate = candidate.add(1, 'day');
  }
  // Fallback to following week
  candidate = candidate.startOf('day').hour(time.hour).minute(time.minute);
  return { matched: match[0], dueAt: candidate.toDate() };
}

function parseInDuration(working: string, now: Dayjs): DueParseResult | undefined {
  const regex = /\bin\s+(\d+)\s*(d|day|days|h|hour|hours|w|week|weeks)\b/i;
  const match = working.match(regex);
  if (!match) {
    return undefined;
  }
  const amount = Number(match[1]);
  const unitToken = match[2].toLowerCase();
  if (Number.isNaN(amount) || amount <= 0) {
    return undefined;
  }

  if (unitToken.startsWith('h')) {
    return {
      matched: match[0],
      dueAt: now.clone().add(amount, 'hour').toDate()
    };
  }

  const base = now
    .clone()
    .add(amount, unitToken.startsWith('w') ? 'week' : 'day')
    .hour(DEFAULT_TASK_TIME.hour)
    .minute(DEFAULT_TASK_TIME.minute)
    .second(0)
    .millisecond(0);

  return { matched: match[0], dueAt: base.toDate() };
}

function parseRecurrenceSegment(text: string, now: Dayjs): ParsedRecurrence {
  const cleaned = text.trim();
  const regex =
    /\bevery\s+([a-z,\s]+?)(?:\s*(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/i;
  const match = cleaned.match(regex);
  if (!match) {
    return { matched: cleaned };
  }

  const dayTokens = match[1]
    .split(/[,/\s]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  const byDay: string[] = [];
  const dayIndices: number[] = [];
  for (const token of dayTokens) {
    const mapped = WEEKDAY_MAP[token];
    if (mapped) {
      if (!byDay.includes(mapped.code)) {
        byDay.push(mapped.code);
        dayIndices.push(mapped.index);
      }
    }
  }

  if (byDay.length === 0) {
    return { matched: match[0] };
  }

  const time = extractTime(match[2], match[3], match[4]);
  const parts = [
    'FREQ=WEEKLY',
    `BYDAY=${byDay.join(',')}`,
    `BYHOUR=${time.hour}`,
    `BYMINUTE=${time.minute}`,
    'BYSECOND=0'
  ];

  const nextOccurrence = findNextOccurrence(now, dayIndices, time.hour, time.minute);

  return {
    matched: match[0],
    rrule: `RRULE:${parts.join(';')}`,
    nextOccurrence: nextOccurrence?.toDate()
  };
}

function extractTime(hour?: string, minute?: string, meridiem?: string) {
  if (!hour) {
    return { ...DEFAULT_TASK_TIME };
  }
  let parsedHour = Number(hour);
  const parsedMinute = minute ? Number(minute) : 0;
  if (Number.isNaN(parsedHour) || parsedHour < 0) {
    parsedHour = DEFAULT_TASK_TIME.hour;
  }
  if (meridiem) {
    const upper = meridiem.toUpperCase();
    if (upper === 'PM' && parsedHour < 12) {
      parsedHour += 12;
    } else if (upper === 'AM' && parsedHour === 12) {
      parsedHour = 0;
    }
  }
  if (parsedHour > 23) {
    parsedHour = parsedHour % 24;
  }
  const safeMinute = Number.isNaN(parsedMinute) ? 0 : Math.min(Math.max(parsedMinute, 0), 59);
  return { hour: parsedHour, minute: safeMinute };
}

function findNextOccurrence(now: Dayjs, dayIndices: number[], hour: number, minute: number) {
  const uniqueDays = Array.from(new Set(dayIndices));
  for (let offset = 0; offset <= 14; offset += 1) {
    const candidate = now
      .clone()
      .add(offset, 'day')
      .hour(hour)
      .minute(minute)
      .second(0)
      .millisecond(0);
    if (uniqueDays.includes(candidate.day()) && candidate.isAfter(now)) {
      return candidate;
    }
  }
  const fallback = now
    .clone()
    .add(1, 'week')
    .hour(hour)
    .minute(minute)
    .second(0)
    .millisecond(0);
  return fallback;
}

function cleanupText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s([,.!?])/g, '$1')
    .trim();
}
