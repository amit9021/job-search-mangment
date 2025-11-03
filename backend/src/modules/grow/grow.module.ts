import { Module } from '@nestjs/common';
import { GrowService } from './grow.service';
import { GrowController } from './grow.controller';

@Module({
  controllers: [GrowController],
  providers: [GrowService]
})
export class GrowModule {}
