import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from '../services/notifications.service';
import { CreateAlertRuleDto, UpdateAlertRuleDto, AlertRuleQueryDto } from '../dto/alert-rule.dto';
// import { AuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';

@Controller('alerts')
// @UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('rules')
  async createAlertRule(@User() user: any, @Body() createDto: CreateAlertRuleDto) {
    return this.notificationService.createAlertRule(user.id, createDto);
  }

  @Get('rules')
  async getAlertRules(@User() user: any, @Query() query: AlertRuleQueryDto) {
    return this.notificationService.getUserAlertRules(user.id, query);
  }

  @Get('rules/:id')
  async getAlertRule(@User() user: any, @Param('id') ruleId: string) {
    return this.notificationService.getAlertRule(user.id, ruleId);
  }

  @Put('rules/:id')
  async updateAlertRule(
    @User() user: any, 
    @Param('id') ruleId: string, 
    @Body() updateDto: UpdateAlertRuleDto
  ) {
    return this.notificationService.updateAlertRule(user.id, ruleId, updateDto);
  }

  @Delete('rules/:id')
  async deleteAlertRule(@User() user: any, @Param('id') ruleId: string) {
    return this.notificationService.deleteAlertRule(user.id, ruleId);
  }

  @Post('rules/:id/test')
  async testAlertRule(@User() user: any, @Param('id') ruleId: string) {
    return this.notificationService.testAlertRule(user.id, ruleId);
  }

  @Get('history')
  async getAlertHistory(@User() user: any, @Query() query: any) {
    return this.notificationService.getAlertHistory(user.id, query);
  }

  @Get('analytics')
  async getAlertAnalytics(@User() user: any) {
    return this.notificationService.getAlertAnalytics(user.id);
  }

  @Post('interaction/:alertId')
  async recordInteraction(
    @User() user: any,
    @Param('alertId') alertId: string,
    @Body() interaction: { action: string }
  ) {
    return this.notificationService.recordUserInteraction(user.id, alertId, interaction.action);
  }

  @Get('templates')
  async getAlertTemplates() {
    return this.notificationService.getAlertTemplates();
  }

  @Post('subscribe-push')
  async subscribeToPush(@User() user: any, @Body() subscription: any) {
    return this.notificationService.subscribeToPushNotifications(user.id, subscription);
  }
}