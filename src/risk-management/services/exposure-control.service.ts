import { Injectable } from '@nestjs/common';

@Injectable()
export class ExposureControlService {
  enforceLimit(currentExposure: number, maxLimit: number): boolean {
    return currentExposure <= maxLimit;
  }
}
