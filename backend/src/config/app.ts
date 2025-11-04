import { registerAs } from '@nestjs/config';

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default registerAs('app', () => ({
  featureFlags: {
    dashboardV1: (process.env.DASHBOARD_V1 ?? 'true') !== 'false'
  },
  dashboard: {
    dailyTargetCv: toNumber(process.env.DAILY_TARGET_CV, 5),
    dailyTargetWarm: toNumber(process.env.DAILY_TARGET_WARM, 5),
    cacheTtlSeconds: toNumber(process.env.DASHBOARD_CACHE_TTL, 15),
    nba: {
      highHeatThreshold: toNumber(process.env.NBA_HIGH_HEAT_THRESHOLD, 3),
      mediumHeatThreshold: toNumber(process.env.NBA_MEDIUM_HEAT_THRESHOLD, 2),
      followUpLookaheadHours: toNumber(process.env.NBA_FOLLOWUP_LOOKAHEAD_HOURS, 48),
      staleTouchDays: toNumber(process.env.NBA_STALE_TOUCH_DAYS, 3)
    }
  }
}));
