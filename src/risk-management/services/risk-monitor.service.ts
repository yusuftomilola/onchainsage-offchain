import { Injectable } from '@nestjs/common';

@Injectable()
export class RiskMonitorService {
  getReport(userId: string) {
    return { message: `Risk report for user ${userId}` };
  }
}
