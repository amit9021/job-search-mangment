import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

export interface HeatRules {
  caps: {
    archived: number;
    stage?: Record<string, number>;
  };
  stageBase: Record<string, number>;
  referral: {
    score: number;
  };
  outreachOutcome: Record<string, number>;
  contactStrength: Record<string, number>;
  channel: Record<string, number>;
  personalizationDivisor: number;
  tailoringDivisor: number;
  decay: {
    halfLifeDays: number;
    minimumFactor?: number;
    maximumDays?: number;
  };
  heatBuckets: Array<{
    maxScore: number;
    heat: number;
  }>;
}

let cachedRules: HeatRules | null = null;

const parseScalar = (value: string) => {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  if (value === 'null' || value === '~') {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }
  return value;
};

const peekNextNonEmptyLine = (
  lines: string[],
  startIndex: number
): { line: string; indent: number } | null => {
  for (let index = startIndex; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw) {
      continue;
    }
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }
    const indent = raw.match(/^\s*/)?.[0].length ?? 0;
    return { line: raw, indent };
  }
  return null;
};

const parseYaml = (input: string): Record<string, unknown> => {
  const root: Record<string, unknown> = {};
  const stack: Array<{
    indent: number;
    type: 'object' | 'array';
    container: Record<string, unknown> | Array<unknown>;
  }> = [{ indent: -1, type: 'object', container: root }];

  const lines = input.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    if (!rawLine) {
      continue;
    }
    const trimmed = rawLine.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }

    const indent = rawLine.match(/^\s*/)?.[0].length ?? 0;

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1];

    if (trimmed.startsWith('- ')) {
      if (current.type !== 'array') {
        throw new Error('Encountered array item without array parent while parsing heat rules');
      }
      const content = trimmed.slice(2);
      let item: unknown;
      if (content.length === 0) {
        item = {};
      } else if (content.includes(':')) {
        const [keyPart, valuePartRaw = ''] = content.split(':', 2);
        const key = keyPart.trim();
        const valuePart = valuePartRaw.trim();
        const obj: Record<string, unknown> = {};
        if (valuePart.length > 0) {
          obj[key] = parseScalar(valuePart);
        }
        item = obj;
      } else {
        item = parseScalar(content);
      }

      (current.container as Array<unknown>).push(item);

      if (item && typeof item === 'object' && !Array.isArray(item)) {
        stack.push({
          indent,
          type: 'object',
          container: item as Record<string, unknown>
        });
      }

      continue;
    }

    const [keyPart, valuePartRaw = ''] = trimmed.split(':', 2);
    const key = keyPart.trim();
    const valuePart = valuePartRaw.trim();

    if (valuePart.length === 0) {
      const nextLine = peekNextNonEmptyLine(lines, i + 1);
      const shouldBeArray =
        nextLine !== null && nextLine.indent > indent && nextLine.line.trim().startsWith('-');
      const container: Record<string, unknown> | Array<unknown> = shouldBeArray ? [] : {};
      (current.container as Record<string, unknown>)[key] = container;
      stack.push({
        indent,
        type: shouldBeArray ? 'array' : 'object',
        container
      });
    } else {
      (current.container as Record<string, unknown>)[key] = parseScalar(valuePart);
    }
  }

  return root;
};

const DEFAULT_RULES: HeatRules = {
  caps: {
    archived: 0,
    stage: {
      OFFER: 95,
      REJECTED: 20,
      DORMANT: 15
    }
  },
  stageBase: {
    APPLIED: 35,
    HR: 50,
    TECH: 65,
    OFFER: 80,
    REJECTED: 10,
    DORMANT: 5
  },
  referral: {
    score: 45
  },
  outreachOutcome: {
    POSITIVE: 30,
    NEGATIVE: -20,
    NO_RESPONSE: 15,
    NONE: 5
  },
  contactStrength: {
    STRONG: 20,
    MEDIUM: 12,
    WEAK: 6,
    UNKNOWN: 4
  },
  channel: {
    EMAIL: 12,
    LINKEDIN: 14,
    PHONE: 16,
    OTHER: 8
  },
  personalizationDivisor: 5,
  tailoringDivisor: 4,
  decay: {
    halfLifeDays: 7,
    minimumFactor: 0.25,
    maximumDays: 30
  },
  heatBuckets: [
    { maxScore: 24, heat: 0 },
    { maxScore: 49, heat: 1 },
    { maxScore: 74, heat: 2 },
    { maxScore: 100, heat: 3 }
  ]
};

const findHeatRulesYaml = () => {
  const candidates = [
    join(__dirname, 'heat-rules.yaml'),
    resolve(process.cwd(), 'dist', 'modules', 'jobs', 'heat-rules.yaml'),
    resolve(process.cwd(), 'src', 'modules', 'jobs', 'heat-rules.yaml')
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

export const loadHeatRules = (): HeatRules => {
  if (cachedRules) {
    return cachedRules;
  }

  const filePath = findHeatRulesYaml();
  if (!filePath) {
    cachedRules = DEFAULT_RULES;
    return cachedRules;
  }

  const raw = readFileSync(filePath, 'utf8');
  const parsed = parseYaml(raw) as unknown as HeatRules;
  cachedRules = parsed;
  return cachedRules;
};

// Provide a way for tests to inject deterministic rules without touching the filesystem.
export const setHeatRules = (overrides: HeatRules | null) => {
  cachedRules = overrides;
};
