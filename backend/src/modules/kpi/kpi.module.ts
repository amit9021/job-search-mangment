import { Module } from '@nestjs/common';

import { RecommendationModule } from '../recommendation/recommendation.module';

import { KpiController } from './kpi.controller';
import { KpiService } from './kpi.service';

@Module({
  imports: [RecommendationModule],
  controllers: [KpiController],
  providers: [KpiService],
  exports: [KpiService]
})
export class KpiModule {}
