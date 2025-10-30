import { Module } from '@nestjs/common';
import { KpiService } from './kpi.service';
import { KpiController } from './kpi.controller';
import { RecommendationModule } from '../recommendation/recommendation.module';

@Module({
  imports: [RecommendationModule],
  controllers: [KpiController],
  providers: [KpiService],
  exports: [KpiService]
})
export class KpiModule {}
