export const TASK_STATUSES = ['Todo', 'Doing', 'Done', 'Blocked'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const ACTIVE_TASK_STATUSES: TaskStatus[] = ['Todo', 'Doing', 'Blocked'];

export const TASK_PRIORITIES = ['Low', 'Med', 'High'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_SOURCES = ['Manual', 'Rule', 'Recommendation'] as const;
export type TaskSource = (typeof TASK_SOURCES)[number];

export const SNOOZE_PRESETS = ['1h', 'tonight', 'tomorrow', 'nextweek'] as const;
export type SnoozePreset = (typeof SNOOZE_PRESETS)[number];

export const DEFAULT_TASK_TIME = { hour: 9, minute: 0 };
