import { Controller, Get, Query } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsWeeklySummaryDto } from './dto/stats-weekly.dto';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('weekly-summary')
  async getWeeklySummary(@Query('range') range?: string): Promise<StatsWeeklySummaryDto> {
    const parsed = Number.parseInt(range ?? '', 10);
    return this.statsService.getWeeklySummary(Number.isFinite(parsed) ? parsed : 7);
  }
}
