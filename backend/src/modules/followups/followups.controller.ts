import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { IdParamDto } from '../../common/dto/id-param.dto';

import { FollowupQueryDto } from './dto/get-followups.query';
import { SendFollowupDto } from './dto/send-followup.dto';
import { CreateFollowupDto } from './dto/create-followup.dto';
import { UpdateFollowupDto } from './dto/update-followup.dto';
import { FollowupsService } from './followups.service';

@Controller('followups')
export class FollowupsController {
  constructor(private readonly followupsService: FollowupsService) {}

  @Get()
  async list(@Query() query: FollowupQueryDto) {
    return this.followupsService.getDue(query.due);
  }

  @Post()
  async schedule(@Body() body: CreateFollowupDto) {
    return this.followupsService.scheduleCustomFollowup(body);
  }

  @Patch(':id/send')
  async markSent(@Param() params: IdParamDto, @Body() body: SendFollowupDto) {
    return this.followupsService.markSent(params.id, body.note);
  }

  @Patch(':id')
  async update(@Param() params: IdParamDto, @Body() body: UpdateFollowupDto) {
    return this.followupsService.updateFollowup(params.id, body);
  }

  @Delete(':id')
  async delete(@Param() params: IdParamDto) {
    return this.followupsService.deleteFollowup(params.id);
  }
}
