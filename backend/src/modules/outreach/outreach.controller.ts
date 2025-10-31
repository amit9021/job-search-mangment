import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { OutreachService } from './outreach.service';
import { ListOutreachQueryDto } from './dto/list-outreach.query';
import { UpdateOutreachDto } from './dto/update-outreach.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('outreach')
export class OutreachController {
  constructor(private readonly outreachService: OutreachService) {}

  @Get()
  async list(@Query() query: ListOutreachQueryDto) {
    return this.outreachService.list(query);
  }

  @Patch(':id')
  async update(@Param() params: IdParamDto, @Body() body: UpdateOutreachDto) {
    return this.outreachService.update(params.id, body);
  }
}
