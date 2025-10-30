import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { EventsService } from './events.service';
import { AddEventContactDto, AttendEventDto, CreateEventDto, UpdateEventDto } from './dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async list() {
    return this.eventsService.list();
  }

  @Post()
  async create(@Body() body: CreateEventDto) {
    return this.eventsService.create(body);
  }

  @Patch(':id')
  async update(@Param() params: IdParamDto, @Body() body: UpdateEventDto) {
    return this.eventsService.update(params.id, body);
  }

  @Post(':id/attend')
  async attend(@Param() params: IdParamDto, @Body() body: AttendEventDto) {
    return this.eventsService.markAttended(params.id, body);
  }

  @Post(':id/contacts')
  async addContact(@Param() params: IdParamDto, @Body() body: AddEventContactDto) {
    return this.eventsService.addContact(params.id, body.contactId, body.followupDueAt, body.note);
  }
}
