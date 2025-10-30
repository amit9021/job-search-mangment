import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  async create(@Body() body: CreateCompanyDto) {
    return this.companiesService.create(body as any);
  }

  @Get()
  async list(@Query('query') query?: string) {
    return this.companiesService.list(query);
  }

  @Get(':id')
  async findById(@Param() params: IdParamDto) {
    return this.companiesService.findById((params as any).id);
  }

  @Patch(':id')
  async update(@Param() params: IdParamDto, @Body() body: UpdateCompanyDto) {
    return this.companiesService.update((params as any).id, body as any);
  }
}
