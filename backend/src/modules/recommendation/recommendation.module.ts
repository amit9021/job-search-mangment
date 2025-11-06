import { Module } from '@nestjs/common';

import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';

@Module({
  providers: [RecommendationService],
  controllers: [RecommendationController],
  exports: [RecommendationService]
})
export class RecommendationModule {}
