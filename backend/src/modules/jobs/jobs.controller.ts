import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  AddApplicationDto,
  CreateJobDto,
  CreateJobOutreachDto,
  ListJobsQueryDto,
  UpdateJobStageDto
} from './dto';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async list(@Query() query: ListJobsQueryDto) {
    return this.jobsService.list(query.stage, query.heat);
  }

  @Post()
  async create(@Body() body: CreateJobDto) {
    const job = await this.jobsService.create(body);
    if (body.initialOutreach) {
      await this.jobsService.recordJobOutreach(job.id, body.initialOutreach);
    }
    return job;
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
  async addOutreach(
    @Param() params: IdParamDto,
    @Body() body: CreateJobOutreachDto
  ) {
    return this.jobsService.recordJobOutreach(params.id, body);
  }

  @Get(':id/history')
  async history(@Param() params: IdParamDto) {
    return this.jobsService.getHistory(params.id);
  }
}
