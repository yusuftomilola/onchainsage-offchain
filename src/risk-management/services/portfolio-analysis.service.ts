import { Injectable } from '@nestjs/common';

@Injectable()
export class PortfolioAnalysisService {
  calculateCorrelation(data1: number[], data2: number[]): number {
    // dummy correlation calc
    return 0.5;
  }
}
