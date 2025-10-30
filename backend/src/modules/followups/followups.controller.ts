import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { FollowupsService } from './followups.service';
import { FollowupQueryDto } from './dto/get-followups.query';
import { SendFollowupDto } from './dto/send-followup.dto';

@Controller('followups')
export class FollowupsController {
  constructor(private readonly followupsService: FollowupsService) {}

  @Get()
  async list(@Query() query: FollowupQueryDto) {
    return this.followupsService.getDue(query.due);
  }

  @Patch(':id/send')
  async markSent(@Param() params: IdParamDto, @Body() body: SendFollowupDto) {
    return this.followupsService.markSent(params.id, body.note);
  }
}
