import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';

import { IdParamDto } from '../../common/dto/id-param.dto';

import { BoostsService } from './boosts.service';
import { CreateBoostTaskDto } from './dto/create-boost-task.dto';

@Controller('boosts')
export class BoostsController {
  constructor(private readonly boostsService: BoostsService) {}

  @Get()
  async list() {
    return this.boostsService.list();
  }

  @Post()
  async create(@Body() body: CreateBoostTaskDto) {
    return this.boostsService.create(body);
  }

  @Patch(':id/complete')
  async complete(@Param() params: IdParamDto) {
    return this.boostsService.complete(params.id);
  }

  @Patch(':id/reopen')
  async reopen(@Param() params: IdParamDto) {
    return this.boostsService.reopen(params.id);
  }

  @Delete(':id')
  async delete(@Param() params: IdParamDto) {
    return this.boostsService.delete(params.id);
  }
}
