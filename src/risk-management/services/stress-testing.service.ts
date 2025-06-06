import { Injectable } from '@nestjs/common';

@Injectable()
export class StressTestingService {
  runScenario(portfolio: any): string {
    return 'Stress test complete';
  }
}
