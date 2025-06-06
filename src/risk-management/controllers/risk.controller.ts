import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { RiskMonitorService } from '../services/risk-monitor.service';
import { UserRiskSettingsDto } from '../dto/user-risk-settings.dto';

@Controller('risk')
export class RiskController {
  constructor(private readonly riskService: RiskMonitorService) {}

  @Post('settings')
  updateUserRiskSettings(@Body() dto: UserRiskSettingsDto) {
    return this.riskService.getReport(dto.userId);
  }

  @Get('report')
  getRiskReport(@Query('userId') userId: string) {
    return this.riskService.getReport(userId);
  }
}
