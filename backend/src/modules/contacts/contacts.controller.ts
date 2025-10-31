import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { OutreachService } from '../outreach/outreach.service';
import { ReferralsService } from '../referrals/referrals.service';
import { ReviewsService } from '../reviews/reviews.service';
import { ContactsService } from './contacts.service';
import {
  CreateContactDto,
  UpdateContactDto,
  CreateContactOutreachDto,
  CreateReferralDto,
  CreateReviewDto,
  ListContactsQueryDto
} from './dto';

@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly contactsService: ContactsService,
    private readonly outreachService: OutreachService,
    private readonly referralsService: ReferralsService,
    private readonly reviewsService: ReviewsService
  ) {}

  @Get()
  async list(@Query() query: ListContactsQueryDto) {
    return this.contactsService.list({
      query: query.query,
      strength: query.strength,
      companyId: query.companyId,
      includeArchived: query.includeArchived,
      page: query.page,
      pageSize: query.pageSize
    });
  }

  @Get('stars')
  async stars() {
    return this.contactsService.listNetworkStars();
  }

  @Get(':id')
  async getById(@Param() params: IdParamDto) {
    return this.contactsService.getById(params.id);
  }

  @Post()
  async create(@Body() body: CreateContactDto) {
    return this.contactsService.create(body as any);
  }

  @Patch(':id')
  async update(@Param() params: IdParamDto, @Body() body: UpdateContactDto) {
    return this.contactsService.update(params.id, body as any);
  }

  @Delete(':id')
  async delete(@Param() params: IdParamDto, @Query('hard') hard?: string) {
    const hardDelete =
      typeof hard === 'string' ? ['true', '1', 'yes', 'on'].includes(hard.toLowerCase()) : false;
    return this.contactsService.delete(params.id, { hard: hardDelete });
  }

  @Post(':id/outreach')
  async outreach(@Param() params: IdParamDto, @Body() body: CreateContactOutreachDto) {
    return this.outreachService.createContactOutreach(params.id, body);
  }

  @Post(':id/referrals')
  async referral(@Param() params: IdParamDto, @Body() body: CreateReferralDto) {
    return this.referralsService.createForContact(params.id, body);
  }

  @Post(':id/reviews')
  async review(@Param() params: IdParamDto, @Body() body: CreateReviewDto) {
    return this.reviewsService.createForContact(params.id, body);
  }
}
