import { Injectable } from '@nestjs/common';

@Injectable()
export class PositionReductionService {
  reducePosition(size: number): number {
    return size * 0.5;
  }
}
