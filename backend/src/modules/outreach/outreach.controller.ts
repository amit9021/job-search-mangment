import { Body, Controller, Delete, Get, Inject, Param, Patch, Query, forwardRef } from '@nestjs/common';
import { OutreachService } from './outreach.service';
import { ListOutreachQueryDto } from './dto/list-outreach.query';
import { UpdateOutreachDto } from './dto/update-outreach.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { JobsService } from '../jobs/jobs.service';

@Controller('outreach')
export class OutreachController {
  constructor(
    private readonly outreachService: OutreachService,
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService: JobsService
  ) {}

  @Get()
  async list(@Query() query: ListOutreachQueryDto) {
    return this.outreachService.list(query);
  }

  @Patch(':id')
  async update(@Param() params: IdParamDto, @Body() body: UpdateOutreachDto) {
    const result = await this.outreachService.update(params.id, body);
    if (result.job?.id) {
      await this.jobsService.recalculateHeat(result.job.id);
    }
    return result;
  }

  @Delete(':id')
  async remove(@Param() params: IdParamDto) {
    const result = await this.outreachService.delete(params.id);
    if (result.jobId) {
      await this.jobsService.recalculateHeat(result.jobId);
    }
    return {
      deletedId: result.id,
      jobId: result.jobId,
      contactId: result.contactId
    };
  }
}
