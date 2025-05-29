import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  private readonly startTime: Date;

  constructor(private readonly configService: ConfigService) {
    this.startTime = new Date();
  }

  getAppInfo() {
    const uptime = this.calculateUptime();
    
    return {
      name: this.configService.get<string>('APP_NAME', 'OnChain Sage Backend'),
      version: this.configService.get<string>('APP_VERSION', '1.0.0'),
      description: 'Decentralized Trading Intelligence Platform Backend',
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      uptime,
      timestamp: new Date().toISOString(),
    };
  }

  ping() {
    return {
      status: 'ok',
      message: 'OnChain Sage Backend is running',
      timestamp: new Date().toISOString(),
    };
  }

  private calculateUptime(): string {
    const now = new Date();
    const uptimeMs = now.getTime() - this.startTime.getTime();
    
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}