import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitHit = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

@Injectable()
export class RateLimitService {
  private readonly attempts = new Map<string, RateLimitEntry>();

  constructor(private readonly configService: ConfigService) {}

  hit(key: string, maxOverride?: number, windowOverride?: number): RateLimitHit {
    const now = Date.now();
    const windowMs = this.resolveWindow(windowOverride);
    const max = this.resolveMax(maxOverride);
    const existing = this.attempts.get(key);
    const entry =
      existing && existing.resetAt > now
        ? existing
        : {
            count: 0,
            resetAt: now + windowMs
          };

    entry.count += 1;
    this.attempts.set(key, entry);

    return {
      allowed: entry.count <= max,
      remaining: Math.max(max - entry.count, 0),
      resetAt: entry.resetAt
    };
  }

  private resolveWindow(override?: number) {
    if (typeof override === 'number' && Number.isFinite(override)) {
      return override;
    }
    const parsed = Number.parseInt(this.configService.get<string>('RATE_LIMIT_WINDOW') ?? '', 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    const fallbackParsed = Number.parseInt(process.env.RATE_LIMIT_WINDOW ?? '', 10);
    if (Number.isFinite(fallbackParsed) && fallbackParsed > 0) {
      return fallbackParsed;
    }
    return 60_000;
  }

  private resolveMax(override?: number) {
    if (typeof override === 'number' && Number.isFinite(override)) {
      return override;
    }
    const parsed = Number.parseInt(this.configService.get<string>('RATE_LIMIT_MAX') ?? '', 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    const fallbackParsed = Number.parseInt(process.env.RATE_LIMIT_MAX ?? '', 10);
    if (Number.isFinite(fallbackParsed) && fallbackParsed > 0) {
      return fallbackParsed;
    }
    return 5;
  }
}
