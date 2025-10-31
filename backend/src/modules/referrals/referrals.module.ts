import { Module, forwardRef } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [forwardRef(() => JobsModule)],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService]
})
export class ReferralsModule {}
