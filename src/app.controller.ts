import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Application')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get application information' })
  @ApiResponse({ 
    status: 200, 
    description: 'Application information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'OnChain Sage Backend' },
        version: { type: 'string', example: '1.0.0' },
        description: { type: 'string', example: 'Decentralized Trading Intelligence Platform Backend' },
        environment: { type: 'string', example: 'development' },
        uptime: { type: 'string', example: '2h 30m 45s' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  getAppInfo() {
    return this.appService.getAppInfo();
  }

  @Get('ping')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        message: { type: 'string', example: 'OnChain Sage Backend is running' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  ping() {
    return this.appService.ping();
  }
}