import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PerformanceTrackingService } from './performance-tracking.service';
import { CreatePerformanceTrackingDto } from './dto/create-performance-tracking.dto';
import { UpdatePerformanceTrackingDto } from './dto/update-performance-tracking.dto';

@Controller('performance-tracking')
export class PerformanceTrackingController {
  constructor(private readonly performanceTrackingService: PerformanceTrackingService) {}

  @Post()
  create(@Body() createPerformanceTrackingDto: CreatePerformanceTrackingDto) {
    return this.performanceTrackingService.create(createPerformanceTrackingDto);
  }

  @Get()
  findAll() {
    return this.performanceTrackingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.performanceTrackingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePerformanceTrackingDto: UpdatePerformanceTrackingDto) {
    return this.performanceTrackingService.update(+id, updatePerformanceTrackingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.performanceTrackingService.remove(+id);
  }
}
