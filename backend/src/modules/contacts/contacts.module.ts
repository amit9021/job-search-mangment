import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { OutreachModule } from '../outreach/outreach.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [OutreachModule, ReferralsModule, ReviewsModule, CompaniesModule],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService]
})
export class ContactsModule {}
