import { Controller, Get, NotFoundException, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly configService: ConfigService
  ) {}

  @Get('summary')
  async getSummary(
    @CurrentUser() user: { id?: string } | null,
    @Query('force') force?: string,
    @Query('range') range?: string,
    @Res({ passthrough: true }) res?: Response
  ): Promise<DashboardSummaryDto> {
    const enabled = this.configService.get<boolean>('app.featureFlags.dashboardV1', true);
    if (!enabled) {
      throw new NotFoundException('Dashboard is currently disabled.');
    }

    const forceRefresh =
      typeof force === 'string' && ['1', 'true', 'yes', 'force'].includes(force.toLowerCase());

    const parsedRange = Number.parseInt(range ?? '', 10);
    const result = await this.dashboardService.getSummary(user?.id, {
      force: forceRefresh,
      range: Number.isFinite(parsedRange) ? parsedRange : undefined
    });

    if (res) {
      res.setHeader('x-dashboard-cache', result.cacheHit ? 'hit' : 'miss');
      res.setHeader('x-dashboard-degraded', result.degraded ? 'true' : 'false');
    }

    return result.payload;
  }
}
