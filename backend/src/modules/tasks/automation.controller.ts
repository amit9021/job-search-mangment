import { Body, Controller, Post } from '@nestjs/common';

import { OutreachAutomationDto } from './dto/outreach-automation.dto';
import { TasksService } from './tasks.service';

@Controller('automation')
export class AutomationController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('outreach-created')
  async outreachCreated(@Body() body: OutreachAutomationDto) {
    return this.tasksService.handleOutreachAutomation(body);
  }
}
