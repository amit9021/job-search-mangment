import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/list-notifications.query';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@Query() query: ListNotificationsQueryDto) {
    return this.notificationsService.list(query.scope);
  }

  @Patch(':id/send')
  async markSent(@Param() params: IdParamDto) {
    return this.notificationsService.markSent(params.id);
  }
}
