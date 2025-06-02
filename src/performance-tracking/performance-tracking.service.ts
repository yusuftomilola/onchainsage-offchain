import { Injectable } from '@nestjs/common';
import { CreatePerformanceTrackingDto } from './dto/create-performance-tracking.dto';
import { UpdatePerformanceTrackingDto } from './dto/update-performance-tracking.dto';

@Injectable()
export class PerformanceTrackingService {
  create(createPerformanceTrackingDto: CreatePerformanceTrackingDto) {
    return 'This action adds a new performanceTracking';
  }

  findAll() {
    return `This action returns all performanceTracking`;
  }

  findOne(id: number) {
    return `This action returns a #${id} performanceTracking`;
  }

  update(id: number, updatePerformanceTrackingDto: UpdatePerformanceTrackingDto) {
    return `This action updates a #${id} performanceTracking`;
  }

  remove(id: number) {
    return `This action removes a #${id} performanceTracking`;
  }
}
