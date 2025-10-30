import { Module } from '@nestjs/common';
import { BoostsService } from './boosts.service';
import { BoostsController } from './boosts.controller';

@Module({
  controllers: [BoostsController],
  providers: [BoostsService],
  exports: [BoostsService]
})
export class BoostsModule {}
