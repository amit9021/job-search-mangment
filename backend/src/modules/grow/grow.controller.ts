import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { GrowService } from './grow.service';
import {
  CreateGrowthReviewDto,
  CreateGrowthEventDto,
  CreateGrowthBoostTaskDto,
  UpdateGrowthBoostTaskDto,
  CreateProjectHighlightDto,
  UpdateProjectHighlightDto
} from './dto';

@Controller('grow')
export class GrowController {
  constructor(private readonly growService: GrowService) {}

  @Get('reviews')
  async listReviews() {
    return this.growService.listReviews();
  }

  @Post('reviews')
  async createReview(@Body() body: CreateGrowthReviewDto) {
    return this.growService.createReview(body);
  }

  @Get('events')
  async listEvents() {
    return this.growService.listEvents();
  }

  @Post('events')
  async createEvent(@Body() body: CreateGrowthEventDto) {
    return this.growService.createEvent(body);
  }

  @Get('boost')
  async listBoostTasks() {
    return this.growService.listBoostTasks();
  }

  @Post('boost')
  async createBoostTask(@Body() body: CreateGrowthBoostTaskDto) {
    return this.growService.createBoostTask(body);
  }

  @Get('boost/suggest')
  async suggestBoostTasks() {
    return this.growService.suggestBoostTasks();
  }

  @Patch('boost/:id')
  async updateBoostTask(@Param() params: IdParamDto, @Body() body: UpdateGrowthBoostTaskDto) {
    return this.growService.updateBoostTask(params.id, body);
  }

  @Get('projects')
  async listProjectHighlights() {
    return this.growService.listProjectHighlights();
  }

  @Post('projects')
  async createProjectHighlight(@Body() body: CreateProjectHighlightDto) {
    return this.growService.createProjectHighlight(body);
  }

  @Patch('projects/:id')
  async updateProjectHighlight(@Param() params: IdParamDto, @Body() body: UpdateProjectHighlightDto) {
    return this.growService.updateProjectHighlight(params.id, body);
  }
}
