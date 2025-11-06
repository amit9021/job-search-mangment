import { Module, forwardRef } from '@nestjs/common';

import { CompaniesModule } from '../companies/companies.module';
import { OutreachModule } from '../outreach/outreach.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { ReviewsModule } from '../reviews/reviews.module';

import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [forwardRef(() => OutreachModule), ReferralsModule, ReviewsModule, CompaniesModule],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService]
})
export class ContactsModule {}
