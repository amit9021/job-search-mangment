import { Controller, Get } from '@nestjs/common';

import { RecommendationService } from '../recommendation/recommendation.service';

import { KpiService } from './kpi.service';

@Controller('kpis')
export class KpiController {
  constructor(
    private readonly kpiService: KpiService,
    private readonly recommendationService: RecommendationService
  ) {}

  @Get('today')
  async today() {
    const [kpis, nextAction] = await Promise.all([
      this.kpiService.getToday(),
      this.recommendationService.getNextRecommendation()
    ]);
    return {
      ...kpis,
      nextBestAction: nextAction
    };
  }

  @Get('week')
  async week() {
    return this.kpiService.getWeek();
  }
}
