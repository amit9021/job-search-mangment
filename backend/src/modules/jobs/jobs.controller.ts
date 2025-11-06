import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { IdParamDto } from '../../common/dto/id-param.dto';

import {
  AddApplicationDto,
  CreateJobDto,
  CreateJobOutreachDto,
  ListJobsQueryDto,
  UpdateJobStageDto,
  UpdateJobDto
} from './dto';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async list(@Query() query: ListJobsQueryDto) {
    return this.jobsService.list({
      stage: query.stage,
      heat: query.heat,
      includeArchived: query.includeArchived,
      query: query.query,
      page: query.page,
      pageSize: query.pageSize
    });
  }

  @Get(':id')
  async getById(@Param() params: IdParamDto) {
    return this.jobsService.getById(params.id);
  }

  @Post()
  async create(@Body() body: CreateJobDto) {
    return this.jobsService.create(body);
  }

  @Patch(':id')
  async update(@Param() params: IdParamDto, @Body() body: UpdateJobDto) {
    return this.jobsService.update(params.id, body);
  }

  @Delete(':id')
  async delete(@Param() params: IdParamDto, @Query('hard') hard?: string) {
    const hardDelete =
      typeof hard === 'string' ? ['true', '1', 'yes', 'on'].includes(hard.toLowerCase()) : false;
    return this.jobsService.delete(params.id, { hard: hardDelete });
  }

  @Post(':id/applications')
  async addApplication(@Param() params: IdParamDto, @Body() body: AddApplicationDto) {
    return this.jobsService.addApplication(params.id, body);
  }

  @Post(':id/status')
  async updateStatus(@Param() params: IdParamDto, @Body() body: UpdateJobStageDto) {
    return this.jobsService.updateStatus(params.id, body);
  }

  @Post(':id/outreach')
  async addOutreach(@Param() params: IdParamDto, @Body() body: CreateJobOutreachDto) {
    return this.jobsService.recordJobOutreach(params.id, body);
  }

  @Get(':id/heat-explain')
  async heatExplain(@Param() params: IdParamDto) {
    return this.jobsService.getHeatExplanation(params.id);
  }

  @Get(':id/history')
  async history(@Param() params: IdParamDto) {
    return this.jobsService.getHistory(params.id);
  }
}
