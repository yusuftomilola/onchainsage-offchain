import { PartialType } from '@nestjs/swagger';
import { CreatePerformanceTrackingDto } from './create-performance-tracking.dto';

export class UpdatePerformanceTrackingDto extends PartialType(CreatePerformanceTrackingDto) {}
