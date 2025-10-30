import { Controller, Get, Query } from '@nestjs/common';
import { OutreachService } from './outreach.service';
import { ListOutreachQueryDto } from './dto/list-outreach.query';

@Controller('outreach')
export class OutreachController {
  constructor(private readonly outreachService: OutreachService) {}

  @Get()
  async list(@Query() query: ListOutreachQueryDto) {
    return this.outreachService.list(query);
  }
}
