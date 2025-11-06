import { Module } from '@nestjs/common';

import { GrowController } from './grow.controller';
import { GrowService } from './grow.service';

@Module({
  controllers: [GrowController],
  providers: [GrowService],
  exports: [GrowService]
})
export class GrowModule {}
