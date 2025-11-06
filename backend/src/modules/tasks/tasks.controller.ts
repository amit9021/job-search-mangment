import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { IdParamDto } from '../../common/dto/id-param.dto';

import { BulkCreateTasksDto } from './dto/bulk-create-tasks.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks.query';
import { QuickParseDto } from './dto/quick-parse.dto';
import { SnoozeTaskDto } from './dto/snooze-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('kpis')
  async getKpis() {
    return this.tasksService.getKpis();
  }

  @Get()
  async list(@Query() query: ListTasksQueryDto) {
    return this.tasksService.list(query);
  }

  @Post()
  async create(@Body() body: CreateTaskDto) {
    return this.tasksService.create(body);
  }

  @Patch(':id')
  async update(@Param() params: IdParamDto, @Body() body: UpdateTaskDto) {
    return this.tasksService.update(params.id, body);
  }

  @Delete(':id')
  async delete(@Param() params: IdParamDto) {
    return this.tasksService.delete(params.id);
  }

  @Post('bulk')
  async bulk(@Body() body: BulkCreateTasksDto) {
    return this.tasksService.bulkCreate(body);
  }

  @Post('quick-parse')
  async quickParse(@Body() body: QuickParseDto) {
    return this.tasksService.quickParse(body);
  }

  @Post('snooze/:id')
  async snooze(@Param() params: IdParamDto, @Body() body: SnoozeTaskDto) {
    return this.tasksService.snooze(params.id, body.preset);
  }
}
