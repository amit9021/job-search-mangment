import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async list() {
    return this.projectsService.list();
  }

  @Post()
  async create(@Body() body: CreateProjectDto) {
    return this.projectsService.create(body);
  }

  @Patch(':id')
  async update(@Param() params: IdParamDto, @Body() body: UpdateProjectDto) {
    return this.projectsService.update(params.id, body);
  }

  @Post(':id/spotlight')
  async toggleSpotlight(@Param() params: IdParamDto) {
    return this.projectsService.toggleSpotlight(params.id);
  }

  @Delete(':id')
  async delete(@Param() params: IdParamDto) {
    return this.projectsService.delete(params.id);
  }
}
