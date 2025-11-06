import { Controller, Get } from '@nestjs/common';

import { RecommendationService } from './recommendation.service';

@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('next')
  async next() {
    const result = await this.recommendationService.getNextRecommendation();
    return {
      title: result.title,
      action: result.action,
      ref: result.ref
    };
  }
}
