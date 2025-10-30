import { Body, Controller, Get, Post } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { CreateReferralBodyDto } from './dto/create-referral.dto';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get()
  async list() {
    return this.referralsService.list();
  }

  @Post()
  async create(@Body() body: CreateReferralBodyDto) {
    const { contactId, ...params } = body as any;
    return this.referralsService.createForContact(contactId, params);
  }
}
