import { Module, forwardRef } from '@nestjs/common';

import { JobsModule } from '../jobs/jobs.module';

import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

@Module({
  imports: [forwardRef(() => JobsModule)],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService]
})
export class ReferralsModule {}
