import { Injectable } from '@nestjs/common';

@Injectable()
export class MonitorService {
  getStatus() {
    return { status: 'healthy' };
  }
}